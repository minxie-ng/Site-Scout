import { expect, it, vi } from 'vitest';
import { loadHdbBlockLeads } from '../src/domain/hdb-block-leads';
import { planOneMapProbes } from '../src/providers/onemap-search';
import { isUsableSecondStageCapture, planSecondStageOneMapProbes,
  runSecondStageOneMapProbes } from '../src/providers/onemap-second-stage';

it('chooses exactly two new HDB identities per town without claiming geographic proximity', () => {
  const inventory = loadHdbBlockLeads();
  const anchors = planOneMapProbes(inventory).probes;
  const plan = planSecondStageOneMapProbes(inventory);
  expect(plan.maxRequests).toBe(54);
  expect(plan.probes).toHaveLength(54);
  expect(plan.outcome).toBe('insufficient_evidence');
  expect(plan.selected).toBeNull();
  expect(plan.proximityStatus).toBe('unverified');
  const ids = new Set<string>();
  for (const [index, anchor] of anchors.entries()) {
    const pair = plan.probes.slice(index * 2, index * 2 + 2);
    expect(pair).toHaveLength(2);
    expect(pair.every(probe => probe.townCode === anchor.townCode &&
      probe.coordinateStatus === 'not_in_hdb_source' && probe.outcome === 'insufficient_evidence')).toBe(true);
    for (const probe of pair) {
      const id = `${probe.townCode}\0${probe.block}\0${probe.street}`;
      expect(ids.has(id)).toBe(false);
      ids.add(id);
      expect(id).not.toBe(`${anchor.townCode}\0${anchor.block}\0${anchor.street}`);
    }
  }
  expect(ids.size).toBe(54);
  expect(plan.selectionRule).toContain('same street');
  expect(plan.selectionRule).toContain('block label');
  expect(plan.selectionRule).toContain('fallback');
});

const tokenWithExpiry = (seconds: number) => `x.${Buffer.from(JSON.stringify({ exp: seconds })).toString('base64url')}.x`;

it('blocks altered plans and missing, expired or unverified authentication before network access', async () => {
  const plan = planSecondStageOneMapProbes(loadHdbBlockLeads());
  const fetcher = vi.fn();
  const now = new Date('2026-10-12T12:00:00Z');
  const validToken = tokenWithExpiry(Date.parse('2026-10-15T00:00:00Z') / 1000);
  expect((await runSecondStageOneMapProbes(plan, { token: '', quotaConfirmed: true, now, fetcher })).status)
    .toBe('auth_unavailable');
  expect((await runSecondStageOneMapProbes(plan, { token: 'opaque', quotaConfirmed: true, now, fetcher })).status)
    .toBe('auth_expiry_unverified');
  expect((await runSecondStageOneMapProbes(plan, { token: tokenWithExpiry(Date.parse('2026-10-12T12:01:00Z') / 1000),
    quotaConfirmed: true, now, fetcher })).status).toBe('auth_expired');
  expect((await runSecondStageOneMapProbes(plan, { token: validToken, quotaConfirmed: false, now, fetcher })).status)
    .toBe('quota_unverified');
  expect(fetcher).not.toHaveBeenCalled();
  plan.probes[0] = { ...plan.probes[0], block: '9999' };
  await expect(runSecondStageOneMapProbes(plan, { token: validToken, quotaConfirmed: true, now, fetcher }))
    .rejects.toThrow('Invalid OneMap probe plan');
  expect(fetcher).not.toHaveBeenCalled();
});

it('uses the exact 54-call plan and stops on rate limit without serializing the credential', async () => {
  const token = tokenWithExpiry(Date.parse('2026-10-15T00:00:00Z') / 1000);
  const fetcher = vi.fn().mockResolvedValue({ ok: false, status: 429 });
  const run = await runSecondStageOneMapProbes(planSecondStageOneMapProbes(loadHdbBlockLeads()), {
    token, quotaConfirmed: true, now: new Date('2026-10-12T12:00:00Z'), fetcher });
  expect(run.status).toBe('rate_limited');
  expect(run.requestsMade).toBe(1);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toContain('searchVal=');
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(token);
  expect(JSON.stringify(run)).not.toContain(token);
});

it.each([
  ['server error', vi.fn().mockResolvedValue({ ok: false, status: 500 })],
  ['network error', vi.fn().mockRejectedValue(new Error('offline'))],
])('stops the batch after one %s', async (_name, fetcher) => {
  const token = tokenWithExpiry(Date.parse('2026-10-15T00:00:00Z') / 1000);
  const run = await runSecondStageOneMapProbes(planSecondStageOneMapProbes(loadHdbBlockLeads()), {
    token, quotaConfirmed: true, now: new Date('2026-10-12T12:00:00Z'), fetcher });
  expect(run.status).toBe('request_failed');
  expect(run.requestsMade).toBe(1);
  expect(run.results).toHaveLength(1);
  expect(run.results[0].status).toBe('request_failed');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('stops when a 200 response contains an authentication warning instead of an address review', async () => {
  const token = tokenWithExpiry(Date.parse('2026-10-15T00:00:00Z') / 1000);
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Authentication token invalid' }),
    { status: 200 }));
  const run = await runSecondStageOneMapProbes(planSecondStageOneMapProbes(loadHdbBlockLeads()), {
    token, quotaConfirmed: true, now: new Date('2026-10-12T12:00:00Z'), fetcher });
  expect(run.status).toBe('invalid_response');
  expect(run.requestsMade).toBe(1);
  expect(run.results[0].status).toBe('invalid_response');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('accepts a complete capture only with 54 raw HTTP 200 reviews and an address point per town', () => {
  const entries = planSecondStageOneMapProbes(loadHdbBlockLeads()).probes.map(probe => ({
    townCode: probe.townCode, status: 'address_point', httpStatus: 200, hasRaw: true }));
  expect(isUsableSecondStageCapture(entries)).toBe(true);
  expect(isUsableSecondStageCapture(entries.slice(1))).toBe(false);
  expect(isUsableSecondStageCapture(entries.map((item, index) => index === 0 ?
    { ...item, status: 'invalid_response' } : item))).toBe(false);
  expect(isUsableSecondStageCapture(entries.map((item, index) => index === 0 ?
    { ...item, status: 'not_found' } : item))).toBe(true);
  expect(isUsableSecondStageCapture(entries.map((item, index) => index < 2 ?
    { ...item, status: 'not_found' } : item))).toBe(false);
  expect(isUsableSecondStageCapture(entries.map((item, index) => index === 0 ?
    { ...item, hasRaw: false } : item))).toBe(false);
});

it('uses same-street candidates where present and labels fallbacks when fewer than two exist', () => {
  const inventory = loadHdbBlockLeads();
  const anchors = planOneMapProbes(inventory).probes;
  const plan = planSecondStageOneMapProbes(inventory);
  for (const [index, anchor] of anchors.entries()) {
    const sameStreetAvailable = inventory.leads.filter(lead => lead.townCode === anchor.townCode &&
      lead.street === anchor.street && lead.coordinateStatus === 'not_in_hdb_source' &&
      lead.block !== anchor.block).length;
    const pair = plan.probes.slice(index * 2, index * 2 + 2);
    expect(pair.filter(probe => probe.street === anchor.street)).toHaveLength(Math.min(2, sameStreetAvailable));
    expect(plan.perTown[index].fallbackCount).toBe(2 - Math.min(2, sameStreetAvailable));
  }
});
