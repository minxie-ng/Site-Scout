import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runLiveResearchComparison } from '../src/providers/live-research-comparison';

const read = (path: string) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const snapshot = () => ({
  clusters: ['block-cluster.json', 'punggol-sapphire-cluster.json', 'punggol-ripples-cluster.json']
    .map(name => read(`src/data/snapshots/2026-10-06/${name}`)),
  competitorLeads: read('src/data/snapshots/2026-10-06/competitor-leads.json'),
  development: read('src/data/snapshots/2026-10-05/developments.json'),
  factorFeed: read('prototype/data.json'),
});
const catalog = (prompt = '0.000000029', completion = '0.00000003') => new Response(JSON.stringify({
  data: [{ id: 'mistralai/mistral-nemo', pricing: { prompt, completion, request: '0' } }],
}), { status: 200 });
const keyBudget = () => new Response(JSON.stringify({ data: { limit: 0.1, limit_remaining: 0.1,
  usage: 0, limit_reset: null } }), { status: 200 });
const chat = () => {
  const claim = snapshot().development.decisionClaims[0];
  return new Response(JSON.stringify({ model: 'mistralai/mistral-nemo', choices: [{ finish_reason: 'stop',
    message: { content: JSON.stringify({ claims: [{ text: claim.claim, evidenceIds: claim.sourceIds,
      evidenceExcerpt: claim.evidenceExcerpt }], conflicts: [], unknowns: [], nextInvestigation: 'Check rent.' }) } }],
    usage: { prompt_tokens: 400, completion_tokens: 70, cost: 0.00002 } }), { status: 200 });
};
const config = (fetcher: typeof fetch) => ({ benchmarkApiKey: 'capped-key', generalApiKey: 'general-key', fetcher });

describe('opt-in live research comparison preflight', () => {
  it('refuses missing or shared credentials before network access', async () => {
    const fetcher = vi.fn();
    const input = snapshot();
    await expect(runLiveResearchComparison(input, input.clusters[0].id,
      { ...config(fetcher as typeof fetch), benchmarkApiKey: '' })).resolves.toMatchObject({ status: 'preflight_failed' });
    await expect(runLiveResearchComparison(input, input.clusters[0].id,
      { ...config(fetcher as typeof fetch), benchmarkApiKey: 'general-key' })).resolves.toMatchObject({ status: 'preflight_failed' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('refuses an overpriced or unavailable tariff before key or chat requests', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => catalog('0.0001', '0.0001'));
    const input = snapshot();
    await expect(runLiveResearchComparison(input, input.clusters[0].id, config(fetcher as typeof fetch)))
      .resolves.toMatchObject({ status: 'preflight_failed', reason: 'tariff_exceeds_reserve' });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/models');
  });

  it('rejects a blank request-fee field before any key or chat request', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 'mistralai/mistral-nemo',
      pricing: { prompt: '0.000000029', completion: '0.00000003', request: ' ' } }] }), { status: 200 }));
    const input = snapshot();
    await expect(runLiveResearchComparison(input, input.clusters[0].id, config(fetcher as typeof fetch)))
      .resolves.toMatchObject({ status: 'preflight_failed', reason: 'tariff_unavailable' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('times out a catalog fetch even when the caller supplied a signal and fetch ignores abort', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(async () => await new Promise<Response>(() => {}));
      const input = snapshot();
      const caller = new AbortController();
      const pending = runLiveResearchComparison(input, input.clusters[0].id,
        { ...config(fetcher as typeof fetch), signal: caller.signal });
      await vi.advanceTimersByTimeAsync(8001);
      await expect(Promise.race([pending, Promise.resolve('pending')]))
        .resolves.toMatchObject({ status: 'preflight_failed', reason: 'tariff_unavailable' });
    } finally { vi.useRealTimers(); }
  });

  it('uses one verified tariff and cap for the same seven cases, with no model tools or automatic acceptance', async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL, _init?: RequestInit) => {
      const address = String(url);
      if (address.endsWith('/models')) return catalog();
      if (address.endsWith('/key')) return keyBudget();
      if (address.endsWith('/chat/completions')) return chat();
      throw new Error('Unexpected URL');
    });
    const input = snapshot();
    const result = await runLiveResearchComparison(input, input.clusters[0].id, config(fetcher as typeof fetch));
    expect(result).toMatchObject({ status: 'ran', model: 'mistralai/mistral-nemo',
      keyCap: { limitUsd: 0.1 },
      tariff: { sourceUrl: 'https://openrouter.ai/api/v1/models', inputUsdPerToken: 0.000000029,
        outputUsdPerToken: 0.00000003 },
      comparison: { status: 'evaluated', kind: 'bounded_agent_comparison', automaticPositiveAcceptance: false,
        superiorityEstablished: false, total: { attemptedCalls: 28, reportedCostUsd: 0.00056 } } });
    expect(result.comparison?.cases).toHaveLength(7);
    expect(result.comparison?.cases.every(item => item.baseline.decision.outcome === 'insufficient_evidence' &&
      item.roles.decision.outcome === 'insufficient_evidence')).toBe(true);
    const posts = fetcher.mock.calls.filter(call => String(call[0]).endsWith('/chat/completions'));
    expect(posts).toHaveLength(28);
    expect(posts.every(call => !('tools' in JSON.parse((call[1] as RequestInit).body as string)))).toBe(true);
    expect(posts.every(call => JSON.parse((call[1] as RequestInit).body as string).max_completion_tokens === 1200)).toBe(true);
    expect(Math.max(...posts.map(call => Buffer.byteLength(JSON.stringify(
      JSON.parse((call[1] as RequestInit).body as string).messages), 'utf8')))).toBeLessThan(3072);
  });
  it('runs a fixed four-case comparison under a sixteen-call cap', async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/models')) return catalog();
      if (String(url).endsWith('/key')) return keyBudget();
      if (String(url).endsWith('/chat/completions')) return chat();
      throw new Error('Unexpected URL');
    });
    const input = snapshot();
    const result = await runLiveResearchComparison(input, input.clusters[0].id,
      { ...config(fetcher as typeof fetch), mode: 'comparison_focused' });
    expect(result).toMatchObject({ status: 'ran', mode: 'comparison_focused',
      comparison: { status: 'evaluated', comparisonProtocol: 'focused_four_case',
        automaticPositiveAcceptance: false, superiorityEstablished: false,
        total: { attemptedCalls: 16, unattemptedCalls: 0, reportedCostUsd: 0.00032 } } });
    expect(result.comparison?.cases.map(item => item.id)).toEqual(['checked_context', 'failed_tool', 'stale_tool', 'missing_fields']);
    expect(fetcher.mock.calls.filter(call => String(call[0]).endsWith('/chat/completions'))).toHaveLength(16);
  });

  it('runs one bounded canary request before a full paid comparison', async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/models')) return catalog();
      if (String(url).endsWith('/key')) return keyBudget();
      if (String(url).endsWith('/chat/completions')) return chat();
      throw new Error('Unexpected URL');
    });
    const input = snapshot();
    const result = await runLiveResearchComparison(input, input.clusters[0].id,
      { ...config(fetcher as typeof fetch), mode: 'canary' });
    expect(result).toMatchObject({ status: 'ran', mode: 'canary', comparison: { status: 'unevaluated',
      attempts: [{ status: 'ok' }], total: { attemptedCalls: 1, unattemptedCalls: 27 } } });
    expect(fetcher.mock.calls.filter(call => String(call[0]).endsWith('/chat/completions'))).toHaveLength(1);
  });

  it('accepts a schema-valid reply after 16 seconds within the reviewed live-call timeout', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(async (url: RequestInfo | URL) => {
        if (String(url).endsWith('/models')) return catalog();
        if (String(url).endsWith('/key')) return keyBudget();
        if (String(url).endsWith('/chat/completions')) return new Promise<Response>(resolve => setTimeout(() => resolve(chat()), 16_000));
        throw new Error('Unexpected URL');
      });
      const input = snapshot();
      const pending = runLiveResearchComparison(input, input.clusters[0].id,
        { ...config(fetcher as typeof fetch), mode: 'canary' });
      await vi.advanceTimersByTimeAsync(16_001);
      const result = await pending;
      expect(result).toMatchObject({ status: 'ran', comparison: { status: 'unevaluated',
        attempts: [{ status: 'ok', role: 'baseline' }], total: { attemptedCalls: 1, unknownChargeAttempts: 0 } } });
    } finally { vi.useRealTimers(); }
  });

  it('runs one market-role diagnostic without approving the comparison', async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/models')) return catalog();
      if (String(url).endsWith('/key')) return keyBudget();
      if (String(url).endsWith('/chat/completions')) return chat();
      throw new Error('Unexpected URL');
    });
    const replay = snapshot();
    const result = await runLiveResearchComparison(replay, replay.clusters[0].id,
      { ...config(fetcher as typeof fetch), mode: 'diagnostic_market' });
    expect(result).toMatchObject({ status: 'ran', mode: 'diagnostic_market', comparison: { status: 'unevaluated',
      attempts: [{ caseId: 'checked_context', arm: 'roles', role: 'market', status: 'ok' }],
      total: { attemptedCalls: 1 } } });
  });
  it('runs one area-role diagnostic without approving the comparison', async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).endsWith('/models')) return catalog();
      if (String(url).endsWith('/key')) return keyBudget();
      if (String(url).endsWith('/chat/completions')) return chat();
      throw new Error('Unexpected URL');
    });
    const input = snapshot();
    const result = await runLiveResearchComparison(input, input.clusters[0].id,
      { ...config(fetcher as typeof fetch), mode: 'diagnostic_area' });
    expect(result).toMatchObject({ status: 'ran', mode: 'diagnostic_area', comparison: { status: 'unevaluated',
      attempts: [{ caseId: 'stale_tool', arm: 'roles', role: 'area', status: 'ok' }],
      total: { attemptedCalls: 1 } } });
    expect(fetcher.mock.calls.filter(call => String(call[0]).endsWith('/chat/completions'))).toHaveLength(1);
  });
});
