import { expect, it, vi } from 'vitest';
import handler, { runOwnerInvestigation } from '../prototype/api/investigate.mjs';

const jevAnswer = { model: 'typesafe/jev-1.13-20260917', usage: { cost: 0.00002 }, answers: {
  research_priority: { type: 'choice', choice: 'market', confidence: 0.55,
    probabilities: { area: 0.25, market: 0.55, challenger: 0.2 } } } };
const chatAnswer = { model: 'mistralai/mistral-nemo', choices: [{ finish_reason: 'stop', message: {
  content: JSON.stringify({ claims: [], conflicts: [], unknowns: ['Current premises rent is not verified.'],
    nextInvestigation: 'Check a current premises listing and permitted use.' }) } }],
  usage: { cost: 0.00003, prompt_tokens: 200, completion_tokens: 70 } };

function provider() {
  const calls: string[] = [];
  const fetcher = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) => {
    calls.push(String(url));
    if (String(url).endsWith('/key')) return new Response(JSON.stringify({ data: { limit: 0.1,
      limit_remaining: 0.09, usage: 0.01, limit_reset: null } }));
    if (String(url).endsWith('/systemone')) return new Response(JSON.stringify(jevAnswer));
    return new Response(JSON.stringify(chatAnswer));
  });
  return { calls, fetcher };
}

it('runs Jev and three bounded roles for the selected checked group while keeping the outcome withheld', async () => {
  const { calls, fetcher } = provider();
  const events: unknown[] = [];
  const result = await runOwnerInvestigation(1, { apiKey: 'dedicated', fetcher, emit: event => events.push(event) });
  expect(result).toMatchObject({ status: 'jev_routed', selectedTask: 'market', routingConfidence: 0.55,
    area: 'Ang Mo Kio', outcome: 'insufficient_evidence', roleCalls: 3,
    knownCostUsd: 0.00011, checkedEvidenceCount: 3 });
  expect(calls.filter(url => url.endsWith('/systemone'))).toHaveLength(1);
  expect(calls.filter(url => url.endsWith('/chat/completions'))).toHaveLength(3);
  expect(events.slice(0, 4)).toMatchObject([{ stage: 'source', status: 'done' }, { stage: 'route', status: 'working' },
    { stage: 'route', status: 'done' }, { stage: 'market', status: 'working' }]);
  expect(events.at(-1)).toMatchObject({ stage: 'result', status: 'done', outcome: 'insufficient_evidence' });
});

it('rejects invalid group input before any provider call and degrades if the capped key is unavailable', async () => {
  const { fetcher } = provider();
  await expect(runOwnerInvestigation(4, { apiKey: 'dedicated', fetcher })).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
  const result = await runOwnerInvestigation(0, { apiKey: '', fetcher });
  expect(result).toMatchObject({ status: 'degraded', outcome: 'insufficient_evidence', roleCalls: 0,
    knownCostUsd: 0 });
  expect(fetcher).not.toHaveBeenCalled();
});

it('rejects a stale browser group digest before checking the provider key', async () => {
  const { fetcher } = provider();
  await expect(runOwnerInvestigation(0, { apiKey: 'dedicated', fetcher,
    expectedGroupDigest: '0'.repeat(64) })).rejects.toThrow('group');
  expect(fetcher).not.toHaveBeenCalled();
});

it('compares fixed and Jev work on the same selected group and role budget without claiming acceleration', async () => {
  const { fetcher } = provider();
  const fixed = await runOwnerInvestigation(0, { apiKey: 'dedicated', fetcher, mode: 'fixed' });
  const routed = await runOwnerInvestigation(0, { apiKey: 'dedicated', fetcher, mode: 'jev' });
  expect(fixed).toMatchObject({ status: 'fixed', roleCalls: 3, knownCostUsd: 0.00009,
    outcome: 'insufficient_evidence' });
  expect(routed).toMatchObject({ status: 'jev_routed', roleCalls: 3, knownCostUsd: 0.00011,
    outcome: 'insufficient_evidence' });
  expect(fixed.checkedEvidenceCount).toBe(routed.checkedEvidenceCount);
  expect(fixed.area).toBe(routed.area);
  expect(fixed.groupDigest).toBe(routed.groupDigest);
  expect(fixed.snapshotDate).toBe(routed.snapshotDate);
});

it('shows a degraded run when Jev succeeds but a research role fails', async () => {
  const { fetcher } = provider();
  const broken = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) =>
    String(url).endsWith('/chat/completions') ? new Response('offline', { status: 503 }) : fetcher(url, init));
  const result = await runOwnerInvestigation(0, { apiKey: 'dedicated', fetcher: broken });
  expect(result).toMatchObject({ status: 'degraded', selectedTask: 'market', roleCalls: 3,
    roleFailures: 3, outcome: 'insufficient_evidence', knownCostUsd: 0.00002 });
});

it('denies unauthorised public requests before any paid provider call', async () => {
  vi.stubEnv('SITE_SCOUT_DEMO_ACCESS_CODE', 'private-demo-code');
  vi.stubEnv('OPENROUTER_BENCHMARK_API_KEY', 'dedicated');
  const response = { code: 200, status(code: number) { this.code = code; return this; },
    json: vi.fn(), setHeader: vi.fn(), write: vi.fn(), end: vi.fn() };
  await handler({ method: 'POST', headers: { origin: 'https://example.test', host: 'example.test',
    'x-site-scout-demo-code': 'wrong-code' }, body: { index: 0, groupDigest: 'a'.repeat(64) } }, response);
  expect(response.code).toBe(403);
  expect(response.write).not.toHaveBeenCalled();
  const providerFetch = vi.fn();
  vi.stubGlobal('fetch', providerFetch);
  await handler({ method: 'POST', headers: { origin: 'https://example.test', host: 'example.test',
    'x-site-scout-demo-code': 'private-demo-code' }, body: { index: 0, groupDigest: 'a'.repeat(64) } }, response);
  expect(providerFetch).not.toHaveBeenCalled();
  expect(response.write).toHaveBeenCalledWith(expect.stringContaining('Checked investigation unavailable'));
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
