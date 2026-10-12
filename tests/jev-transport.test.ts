import { describe, expect, it, vi } from 'vitest';
import { checkClaimWithJev, readOpenRouterKeyBudget, checkClaimWithMicroLimitedJev } from '../src/providers/typesafe';

const input = { claim: 'The project has 1,179 flats.', quote: '1,179 flats', passage: 'The project has 1,179 flats in six blocks.' };
const answer = (cost?: number) => ({ model: 'typesafe/jev-1.13-20260917', answers: { claim_support: { type: 'choice', choice: 'supported', confidence: 0.95, probabilities: { supported: 0.95, contradicted: 0.03, not_established: 0.02 } } }, usage: cost === undefined ? undefined : { cost } });

describe('Jev benchmark transport prerequisites', () => {
  it('retains reported billing and passes an external abort to the OpenRouter request', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(answer(0.000017)), { status: 200 }));
    const result = await checkClaimWithJev(input, { openRouterApiKey: 'test', fetcher, signal: controller.signal });
    expect(result).toMatchObject({ verdict: 'review', suggestion: 'supported', model: 'typesafe/jev-1.13-20260917', reportedCostUsd: 0.000017 });
    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    controller.abort();
  });

  it('marks missing or malformed provider billing as unknown', async () => {
    for (const payload of [answer(), answer(-1)]) {
      const result = await checkClaimWithJev(input, { openRouterApiKey: 'test', fetcher: vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 })) });
      expect(result.reportedCostUsd).toBeNull();
    }
  });

  it('reads actual key limits without exposing identity and rejects a key above the micro-limit', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { limit: 0.01, limit_remaining: 0.009, usage: 0.001, limit_reset: null } }), { status: 200 }));
    await expect(readOpenRouterKeyBudget({ apiKey: 'test', fetcher, requiredLimitUsd: 0.01 })).resolves.toMatchObject({ limitUsd: 0.01, remainingUsd: 0.009 });
    expect(fetcher.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/key');
    const oversized = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { limit: 5, limit_remaining: 4.9, usage: 0.1, limit_reset: null } }), { status: 200 }));
    await expect(readOpenRouterKeyBudget({ apiKey: 'test', fetcher: oversized, requiredLimitUsd: 0.01 })).rejects.toThrow();
  });

  it('checks the same micro-limited key before a model call and fails closed on unknown billing', async () => {
    const urls: string[] = [];
    const fetcher = vi.fn(async (url: RequestInfo | URL) => {
      urls.push(String(url));
      if (String(url).endsWith('/key')) return new Response(JSON.stringify({ data: { limit: 0.01, limit_remaining: 0.01, usage: 0, limit_reset: null } }), { status: 200 });
      return new Response(JSON.stringify(answer()), { status: 200 });
    });
    const result = await checkClaimWithMicroLimitedJev(input, { openRouterApiKey: 'test', fetcher });
    expect(urls).toEqual(['https://openrouter.ai/api/v1/key', 'https://openrouter.ai/api/v1/systemone']);
    expect(result).toMatchObject({ verdict: 'review', reason: 'billing_unverified', reportedCostUsd: null });
    const oversized = vi.fn(async (_url: RequestInfo | URL) => new Response(JSON.stringify({ data: { limit: 5, limit_remaining: 5, usage: 0, limit_reset: null } }), { status: 200 }));
    expect(await checkClaimWithMicroLimitedJev(input, { openRouterApiKey: 'test', fetcher: oversized })).toMatchObject({ verdict: 'review', reason: 'micro_limit_unavailable' });
    expect(oversized).toHaveBeenCalledTimes(1);
  });

  it('rejects a resettable micro-limit', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { limit: 0.01, limit_remaining: 0.01, usage: 0, limit_reset: 'monthly' } }), { status: 200 }));
    await expect(readOpenRouterKeyBudget({ apiKey: 'test', fetcher, requiredLimitUsd: 0.01 })).rejects.toThrow();
  });

  it('returns review after an abort that occurs while the provider response is being decoded', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn().mockImplementation(async () => ({ ok: true, json: async () => { controller.abort(); return answer(0.000017); } }));
    const result = await checkClaimWithJev(input, { openRouterApiKey: 'test', fetcher, signal: controller.signal });
    expect(result).toMatchObject({ verdict: 'review', reason: 'request_aborted' });
    expect(result.suggestion).toBeUndefined();
  });

  it('cancels an in-flight key check without posting to the model', async () => {
    const controller = new AbortController();
    const urls: string[] = [];
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      urls.push(String(url));
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        controller.abort();
      });
    });
    const result = await checkClaimWithMicroLimitedJev(input, { openRouterApiKey: 'test', fetcher, signal: controller.signal });
    expect(result).toMatchObject({ verdict: 'review' });
    expect(urls).toEqual(['https://openrouter.ai/api/v1/key']);
  });

  it('preserves cancellation when the model request is aborted', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).endsWith('/key')) return new Response(JSON.stringify({ data: { limit: 0.01, limit_remaining: 0.01, usage: 0, limit_reset: null } }), { status: 200 });
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
        controller.abort();
      });
    });
    const result = await checkClaimWithMicroLimitedJev(input, { openRouterApiKey: 'test', fetcher, signal: controller.signal });
    expect(result).toMatchObject({ verdict: 'review', reason: 'request_aborted' });
  });

  it('rejects a response decoded after its internal timeout even when fetch ignores abort', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn(async () => ({ ok: true, json: async () => new Promise(resolve => setTimeout(() => resolve(answer(0.000017)), 8100)) })) as unknown as typeof fetch;
      const pending = checkClaimWithJev(input, { openRouterApiKey: 'test', fetcher });
      await vi.advanceTimersByTimeAsync(8100);
      const result = await pending;
      expect(result).toMatchObject({ verdict: 'review', reason: 'request_aborted', reportedCostUsd: null });
      expect(result.suggestion).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not post after a late key-budget response passes the internal timeout', async () => {
    vi.useFakeTimers();
    try {
      const urls: string[] = [];
      const fetcher = vi.fn(async (url: RequestInfo | URL) => {
        urls.push(String(url));
        if (String(url).endsWith('/key')) return { ok: true, json: async () => new Promise(resolve => setTimeout(() => resolve({ data: { limit: 0.01, limit_remaining: 0.01, usage: 0, limit_reset: null } }), 8100)) } as Response;
        return new Response(JSON.stringify(answer(0.000017)));
      });
      const pending = checkClaimWithMicroLimitedJev(input, { openRouterApiKey: 'test', fetcher });
      await vi.advanceTimersByTimeAsync(8100);
      expect(await pending).toMatchObject({ verdict: 'review', reason: 'micro_limit_unavailable', reportedCostUsd: null });
      expect(urls).toEqual(['https://openrouter.ai/api/v1/key']);
    } finally {
      vi.useRealTimers();
    }
  });
});
