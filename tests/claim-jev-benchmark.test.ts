import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { parseClaimBenchmark } from '../src/providers/claim-benchmark';
import * as claimCheck from '../src/providers/claim-check';
import { runJevClaimBenchmark } from '../src/providers/claim-jev-benchmark';

const cases = () => parseClaimBenchmark(JSON.parse(readFileSync(resolve('tests/fixtures/claim-check.json'), 'utf8')));
const key = () => new Response(JSON.stringify({ data: { limit: 0.01, limit_remaining: 0.01, usage: 0, limit_reset: null } }));
const model = (cost: number, served = 'typesafe/jev-1.13-20260917', confidence = 0.95) => new Response(JSON.stringify({ model: served, usage: { cost }, answers: { claim_support: { type: 'choice', choice: 'supported', confidence, probabilities: { supported: 0.95, contradicted: 0.03, not_established: 0.02 } } } }));

describe('sequential guarded Jev benchmark', () => {
  it('uses the locked copy, rechecks the micro key before each POST, and compares with baseline', async () => {
    const urls: string[] = [];
    const fetcher = vi.fn(async (url: RequestInfo | URL) => { urls.push(String(url)); return String(url).endsWith('/key') ? key() : model(0.000001); });
    const input = cases();
    const report = await runJevClaimBenchmark(input, { benchmarkApiKey: 'dedicated', fetcher });
    expect(report).toMatchObject({ status: 'evaluated', autoAcceptanceEnabled: false, total: 30, heldOut: 10, measuredCostUsd: expect.any(Number), heldOutUnsupportedAccepted: expect.any(Number), supportedAccepted: expect.any(Number) });
    expect(report.results).toHaveLength(30);
    expect(report.results[0]).toMatchObject({ id: 't01', rawSuggestion: 'supported', finalVerdict: 'review', servedModel: 'typesafe/jev-1.13-20260917', reportedCostUsd: 0.000001 });
    expect(report.baseline).toMatchObject({ baseline: 'conservative_precheck', total: 30 });
    expect(report.results.every(item => item.latencyMs >= 0)).toBe(true);
    expect(urls.filter(url => url.endsWith('/systemone')).length).toBe(report.modelCalls);
    for (let i = 0; i < urls.length; i++) if (urls[i].endsWith('/systemone')) expect(urls[i - 1]).toMatch(/\/key$/);
    expect(input[0].claim).toBe('Block 10 has 100 flats.');
  });

  it('does not post or expose zero held-out failures with a missing or oversized key', async () => {
    const fetcher = vi.fn(async () => key());
    const missing = await runJevClaimBenchmark(cases(), { benchmarkApiKey: '', fetcher });
    expect(missing).toMatchObject({ status: 'unevaluated', heldOutUnsupportedAccepted: null, supportedAccepted: null, measuredCostUsd: null, modelCalls: 0, autoAcceptanceEnabled: false });
    expect(fetcher).not.toHaveBeenCalled();
    const large = await runJevClaimBenchmark(cases(), { benchmarkApiKey: 'general', fetcher: vi.fn(async () => new Response(JSON.stringify({ data: { limit: 5, limit_remaining: 5, usage: 0, limit_reset: null } }))) });
    expect(large).toMatchObject({ status: 'unevaluated', heldOutUnsupportedAccepted: null, measuredCostUsd: null, modelCalls: 0 });
  });

  it('counts a low-confidence supported choice as a raw false acceptance while keeping final review', async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).endsWith('/key')) return key();
      const claim = JSON.parse(String(init?.body)).state.claim;
      return model(0.000001, undefined, claim === 'The new bus stop will increase weekday class attendance.' ? 0.7 : 0.95);
    });
    const report = await runJevClaimBenchmark(cases(), { benchmarkApiKey: 'dedicated', fetcher });
    expect(report).toMatchObject({ status: 'evaluated', heldOutUnsupportedAccepted: 3, autoAcceptanceEnabled: false });
    expect(report.results.find(item => item.id === 'h08')).toMatchObject({ rawSuggestion: 'supported', finalVerdict: 'review', reason: 'low_confidence' });
  });

  it.each(['unknown_cost', 'wrong_model', 'abort'] as const)('marks %s and partial runs unevaluated', async problem => {
    const controller = new AbortController();
    let posts = 0;
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/key')) return key();
      posts++;
      if (problem === 'abort') controller.abort();
      if (problem === 'unknown_cost') return model(undefined as never);
      return model(0.000001, problem === 'wrong_model' ? 'other-model' : undefined);
    });
    const report = await runJevClaimBenchmark(cases(), { benchmarkApiKey: 'dedicated', fetcher, signal: controller.signal });
    expect(report).toMatchObject({ status: 'unevaluated', heldOutUnsupportedAccepted: null, supportedAccepted: null, autoAcceptanceEnabled: false });
    expect(posts).toBe(1);
    expect(report.results.length).toBeLessThan(30);
  });

  it.each(['unknown_cost', 'wrong_model', 'bad_cap'] as const)('keeps a failed 30th case unevaluated for %s', async problem => {
    const precheck = vi.spyOn(claimCheck, 'precheckClaim').mockReturnValue(null);
    let posts = 0;
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/key')) {
        const cap = problem === 'bad_cap' && posts === 29 ? 5 : 0.01;
        return new Response(JSON.stringify({ data: { limit: cap, limit_remaining: cap, usage: 0, limit_reset: null } }));
      }
      posts++;
      return model(problem === 'unknown_cost' && posts === 30 ? undefined as never : 0.000001,
        problem === 'wrong_model' && posts === 30 ? 'other-model' : undefined);
    });
    const report = await runJevClaimBenchmark(cases(), { benchmarkApiKey: 'dedicated', fetcher });
    expect(report).toMatchObject({ status: 'unevaluated', heldOutUnsupportedAccepted: null, supportedAccepted: null, measuredCostUsd: null });
    expect(report.results).toHaveLength(30);
    precheck.mockRestore();
  });
});
