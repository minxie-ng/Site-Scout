import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadHdbBlockLeads } from '../src/domain/hdb-block-leads';
import { isCompleteOneMapSample, planOneMapProbes, reviewOneMapSearch, runOneMapProbes } from '../src/providers/onemap-search';

const inventory = loadHdbBlockLeads();
const pg = inventory.leads.find(lead => lead.townCode === 'PG' && lead.block === '442A')!;
const response = { found: 1, totalNumPages: 1, pageNum: 1, results: [{ BLK_NO: '442A',
  ROAD_NAME: 'NEW PUNGGOL ROAD', LATITUDE: '1.4165', LONGITUDE: '103.9075', POSTAL: '821442' }] };

it('plans at most one unverified exact address per each of 27 HDB town codes', () => {
  const plan = planOneMapProbes(inventory);
  expect(plan.maxRequests).toBe(27);
  expect(plan.probes).toHaveLength(27);
  expect(new Set(plan.probes.map(probe => probe.townCode)).size).toBe(27);
  expect(plan.probes.every(probe => probe.coordinateStatus === 'not_in_hdb_source' &&
    probe.outcome === 'insufficient_evidence')).toBe(true);
  expect(plan.selected).toBeNull();
});

it('accepts only one exact Singapore block and street point with provenance', () => {
  expect(reviewOneMapSearch(pg, response, '2026-10-12')).toMatchObject({ status: 'address_point',
    coordinate: { latitude: 1.4165, longitude: 103.9075 }, retrievedDate: '2026-10-12',
    geographicScope: '442A NEW PUNGGOL RD, Singapore', outcome: 'insufficient_evidence' });
  expect(reviewOneMapSearch(pg, { ...response, results: [{ ...response.results[0], BLK_NO: '442B' }] }, '2026-10-12').status).toBe('not_found');
  expect(reviewOneMapSearch(pg, { ...response, results: [{ ...response.results[0], ROAD_NAME: 'PUNGGOL WALK' }] }, '2026-10-12').status).toBe('not_found');
  expect(reviewOneMapSearch(pg, { ...response, found: 2, results: [response.results[0], response.results[0]] }, '2026-10-12').status).toBe('ambiguous');
  expect(reviewOneMapSearch(pg, { ...response, totalNumPages: 2 }, '2026-10-12').status).toBe('incomplete');
  expect(reviewOneMapSearch(pg, { ...response, results: [{ ...response.results[0], LATITUDE: '40' }] }, '2026-10-12').status).toBe('invalid_response');
  expect(reviewOneMapSearch(pg, { ...response, error: 'Authentication token missing' }, '2026-10-12').status).toBe('invalid_response');
  expect(reviewOneMapSearch(pg, { ...response, found: 0 }, '2026-10-12').status).toBe('invalid_response');
  expect(reviewOneMapSearch(pg, { ...response, found: 2 }, '2026-10-12').status).toBe('invalid_response');
  expect(reviewOneMapSearch(pg, response, '2026-99-99').status).toBe('invalid_response');
});

it('does not call Search without a token and quota preflight; replay remains available', async () => {
  const fetcher = vi.fn();
  const plan = planOneMapProbes(inventory);
  expect((await runOneMapProbes(plan, { token: '', quotaConfirmed: true, fetcher })).status).toBe('auth_unavailable');
  expect((await runOneMapProbes(plan, { token: 'secret', quotaConfirmed: false, fetcher })).status).toBe('quota_unverified');
  expect(fetcher).not.toHaveBeenCalled();
  expect(inventory.leads.filter(lead => lead.coordinateStatus === 'checked_replay')).toHaveLength(9);
  const unavailable = await runOneMapProbes(plan, { token: '', quotaConfirmed: true, fetcher });
  expect(unavailable.replay.checkedPoints).toHaveLength(9);
  expect(unavailable.replay.checkedPoints.every(point => point.coordinateStatus === 'checked_replay')).toBe(true);
  expect(unavailable.replay.checkedPoints.find(point => point.block === '442A')?.coordinate?.retrievedAt)
    .toBe('2026-10-05T08:35:52Z');
  expect(unavailable.replay).not.toHaveProperty('retrievedDate');
});

it('rejects altered probe identities before any live request', async () => {
  const plan = planOneMapProbes(inventory);
  const fetcher = vi.fn();
  plan.probes[0] = { ...plan.probes[0], block: '9999' };
  await expect(runOneMapProbes(plan, { token: 'secret', quotaConfirmed: true, fetcher })).rejects.toThrow('Invalid OneMap probe plan');
  expect(fetcher).not.toHaveBeenCalled();
});

it('uses fixed authenticated Search, caps calls and stops on a rate limit', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 429 });
  const result = await runOneMapProbes(planOneMapProbes(inventory), {
    token: 'secret', quotaConfirmed: true, fetcher });
  expect(result.status).toBe('rate_limited');
  expect(result.requestsMade).toBe(1);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const [url, options] = fetcher.mock.calls[0];
  expect(url).toMatch(/^https:\/\/www\.onemap\.gov\.sg\/api\/common\/elastic\/search\?/);
  expect(url).toContain('returnGeom=Y');
  expect(options.headers.Authorization).toBe('secret');
  expect(JSON.stringify(result)).not.toContain('secret');
});

it('recognizes only documented HDB street abbreviations and excludes non-address POI results', () => {
  for (const code of ['BB', 'CL', 'QT']) {
    const lead = planOneMapProbes(inventory).probes.find(probe => probe.townCode === code)!;
    const raw = JSON.parse(readFileSync(`src/data/snapshots/2026-10-12/original/onemap-sample-${code.toLowerCase()}.json`, 'utf8'));
    expect(reviewOneMapSearch(lead, raw, '2026-10-12').status).toBe('address_point');
  }
});

it('rejects oversized successful responses without reading the whole payload', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('x'.repeat(70_000), { status: 200 }));
  const result = await runOneMapProbes(planOneMapProbes(inventory), { token: 'secret', quotaConfirmed: true, fetcher });
  expect(result.results[0]?.status).toBe('request_failed');
  expect(result.results.every(item => item.status !== 'address_point')).toBe(true);
});

it('does not call 27 attempted requests a successful 27-point sample', () => {
  const good = Array.from({ length: 27 }, () => ({ status: 'address_point', httpStatus: 200, hasRaw: true }));
  expect(isCompleteOneMapSample(good)).toBe(true);
  expect(isCompleteOneMapSample(good.slice(1))).toBe(false);
  expect(isCompleteOneMapSample(good.map((entry, i) => i === 4 ? { ...entry, status: 'request_failed' } : entry))).toBe(false);
  expect(isCompleteOneMapSample(good.map((entry, i) => i === 4 ? { ...entry, hasRaw: false } : entry))).toBe(false);
});
