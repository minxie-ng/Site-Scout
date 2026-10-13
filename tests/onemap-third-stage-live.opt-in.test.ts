import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { loadCandidateEligibility } from '../src/domain/candidate-eligibility';
import { loadHdbBlockLeads } from '../src/domain/hdb-block-leads';
import { reviewOneMapSearch } from '../src/providers/onemap-search';
import { planThirdStageOneMapProbes } from '../src/providers/onemap-third-stage';

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const batchPath = 'src/data/snapshots/2026-10-13/original/onemap-third-stage-batch.jsonl';
const manifestPath = 'src/data/snapshots/2026-10-13/onemap-third-stage.json';

it.skipIf(process.env.RUN_ONEMAP_THIRD_STAGE !== '1')('captures or resumes at most 80 authenticated searches', async () => {
  expect(existsSync(manifestPath)).toBe(false);
  process.loadEnvFile('.env.local');
  const token = process.env.ONEMAP_API_TOKEN ?? '';
  expect(token && !token.startsWith('replace_with_')).toBe(true);
  const expiry = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).exp;
  expect(Number.isSafeInteger(expiry) && expiry * 1000 > Date.now() + 5 * 60_000).toBe(true);
  const inventory = loadHdbBlockLeads();
  const base = loadCandidateEligibility(2);
  const second = JSON.parse(readFileSync('src/data/snapshots/2026-10-12/onemap-second-stage.json', 'utf8'));
  const unresolved = second.entries.filter((entry: any) => entry.reviewStatus === 'not_found')
    .map((entry: any) => `${entry.townCode}:${entry.block}:${entry.street}`);
  const plan = planThirdStageOneMapProbes(inventory, base.checkedPoints, base.groups, unresolved);
  type Capture = { sourceUrl: string; retrievedAt: string; httpStatus: 200; sha256: string; bodyBase64: string };
  mkdirSync('src/data/snapshots/2026-10-13/original', { recursive: true });
  const saved: Capture[] = existsSync(batchPath) ? readFileSync(batchPath, 'utf8').trim().split('\n')
    .filter(Boolean).map(line => JSON.parse(line)) : [];
  expect(saved.length).toBeLessThanOrEqual(plan.maxRequests);
  const captures: Capture[] = [];
  let next = 0;
  let freshCalls = 0;
  const fetcher = async (url: string, init: RequestInit) => {
    const index = next++;
    const prior = saved[index];
    if (prior) {
      const raw = Buffer.from(prior.bodyBase64, 'base64');
      if (prior.sourceUrl !== url || prior.httpStatus !== 200 || raw.length > 64_000 ||
        sha256(raw) !== prior.sha256 || raw.toString('utf8').includes(token))
        throw new Error('Third-stage capture integrity failure');
      captures.push(prior);
      return new Response(raw, { status: 200 });
    }
    if (index !== saved.length + freshCalls) throw new Error('Nonsequential capture resume');
    await new Promise(resolve => setTimeout(resolve, 250)); // At most four fresh calls per second.
    freshCalls++;
    const response = await fetch(url, init);
    if (response.status !== 200) return response;
    const limit = 64_000;
    if (!response.body) throw new Error('Missing OneMap response body');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error('OneMap response too large'); }
      chunks.push(item.value);
    }
    const raw = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
    if (raw.toString('utf8').includes(token)) throw new Error('Credential in OneMap response');
    const capture: Capture = { sourceUrl: url, retrievedAt: new Date().toISOString(),
      httpStatus: 200, sha256: sha256(raw), bodyBase64: raw.toString('base64') };
    appendFileSync(batchPath, JSON.stringify(capture) + '\n');
    captures.push(capture);
    return new Response(raw, { status: 200 });
  };
  const reviews: ReturnType<typeof reviewOneMapSearch>[] = [];
  for (const lead of plan.probes) {
    const url = reviewOneMapSearch(lead, null, '2026-10-13').sourceUrl;
    const response = await fetcher(url, { headers: { Authorization: token }, redirect: 'error',
      signal: AbortSignal.timeout(10_000) });
    if (response.status !== 200) throw new Error(`OneMap batch stopped at HTTP ${response.status}`);
    const capture = captures.at(-1)!;
    const reviewed = reviewOneMapSearch(lead,
      JSON.parse(Buffer.from(capture.bodyBase64, 'base64').toString('utf8')), capture.retrievedAt.slice(0, 10));
    if (!['address_point', 'not_found', 'ambiguous', 'incomplete'].includes(reviewed.status))
      throw new Error('OneMap batch stopped at invalid response');
    reviews.push(reviewed);
  }
  expect(captures).toHaveLength(80);
  expect(reviews).toHaveLength(80);
  const entries = captures.map((capture, index) => ({ townCode: plan.probes[index].townCode,
    block: plan.probes[index].block, street: plan.probes[index].street,
    sourceUrl: capture.sourceUrl, retrievedAt: capture.retrievedAt, httpStatus: capture.httpStatus,
    rawPath: batchPath, rawIndex: index, sha256: capture.sha256,
    reviewStatus: reviews[index].status, outcome: 'insufficient_evidence' }));
  writeFileSync(manifestPath, JSON.stringify({ schemaVersion: 1, requestCeiling: 80,
    geographicScope: 'Eight additional exact HDB block-and-street searches in each of ten Singapore HDB codes without a checked three-block witness',
    selectionRule: plan.selectionRule, proximityStatus: 'unverified', selected: null,
    outcome: 'insufficient_evidence', runStatus: 'complete', requestsMade: 80,
    resumedFromCount: saved.length, freshCallsThisRun: freshCalls,
    batchSha256: sha256(readFileSync(batchPath)), entries }, null, 2) + '\n', { flag: 'wx' });
  expect(entries).toHaveLength(80);
}, 120_000);
