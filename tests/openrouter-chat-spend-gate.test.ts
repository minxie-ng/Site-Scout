import { describe, expect, it, vi } from 'vitest';
import { createOpenRouterChatSpendGate } from '../src/providers/openrouter-chat-spend-gate';

const response = (limit = 0.01, remaining = 0.01, reset: null | string = null) =>
  new Response(JSON.stringify({ data: { limit, limit_remaining: remaining, usage: limit - remaining, limit_reset: reset } }), { status: 200 });
const options = (fetcher: typeof fetch) => ({ apiKey: 'dedicated-chat-key', forbiddenApiKeys: ['general-key', 'jev-key'],
  maxAccountLimitUsd: 0.01, maxRequestCostUsd: 0.001, maxTotalAttempts: 28, fetcher });

describe('OpenRouter dedicated chat spending gate', () => {
  it('verifies a non-resetting dedicated key without exposing its secret', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => response());
    const gate = createOpenRouterChatSpendGate(options(fetcher as typeof fetch));
    const snapshot = await gate.check();
    expect(snapshot).toMatchObject({ purpose: 'dedicated_chat_benchmark', limitUsd: 0.01, remainingUsd: 0.01, resetAt: null });
    expect(snapshot.keyId).not.toContain('dedicated-chat-key');
    expect(fetcher.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/key');
    expect(fetcher.mock.calls[0][1]).toMatchObject({ headers: { Authorization: 'Bearer dedicated-chat-key' } });
  });

  it('accepts an explicitly approved ten-cent provider cap while retaining the local attempt limit', async () => {
    const gate = createOpenRouterChatSpendGate({ ...options(vi.fn(async () => response(0.1, 0.1)) as typeof fetch),
      maxAccountLimitUsd: 0.1, maxRequestCostUsd: 0.00017, maxTotalAttempts: 1 });
    const { keyId, limitUsd } = await gate.check();
    expect(limitUsd).toBe(0.1);
    expect(await gate.reserve(keyId, 0.00017)).toBeTruthy();
    expect(await gate.reserve(keyId, 0.00017)).toBeNull();
  });

  it('rejects a provider cap above the approved ten cents', async () => {
    const gate = createOpenRouterChatSpendGate({ ...options(vi.fn(async () => response(0.11, 0.11)) as typeof fetch),
      maxAccountLimitUsd: 0.1 });
    await expect(gate.check()).rejects.toThrow();
  });

  it('rejects shared, resetting, oversized, malformed, or unavailable caps before reservation', async () => {
    expect(() => createOpenRouterChatSpendGate({ ...options(vi.fn() as typeof fetch), apiKey: 'general-key' })).toThrow();
    for (const result of [response(1), response(0.01, 0.01, 'monthly'),
      new Response('{}', { status: 200 }), new Response('failed', { status: 503 })]) {
      const gate = createOpenRouterChatSpendGate(options(vi.fn(async () => result) as typeof fetch));
      await expect(gate.check()).rejects.toThrow();
      await expect(gate.reserve('unknown', 0.001)).resolves.toBeNull();
    }
  });

  it('reserves atomically across concurrent attempts and never frees an unknown charge', async () => {
    const gate = createOpenRouterChatSpendGate({ ...options(vi.fn(async () => response(0.01, 0.002)) as typeof fetch),
      maxTotalAttempts: 2 });
    const { keyId } = await gate.check();
    const reserved = await Promise.all([gate.reserve(keyId, 0.001), gate.reserve(keyId, 0.001), gate.reserve(keyId, 0.001)]);
    expect(reserved.filter(Boolean)).toHaveLength(2);
    expect(await gate.reserve(keyId, 0.001)).toBeNull();
    // The first request has unknown billing, so its reservation is retained.
    await gate.settle(reserved[1]!, 0.0002);
    expect((await gate.check()).remainingUsd).toBeCloseTo(0.0008);
    expect(await gate.reserve(keyId, 0.001)).toBeNull();
  });

  it('tracks known charges even if the provider key endpoint lags, and rejects double settlement', async () => {
    const gate = createOpenRouterChatSpendGate(options(vi.fn(async () => response()) as typeof fetch));
    const { keyId } = await gate.check();
    const id = await gate.reserve(keyId, 0.001);
    expect(id).toBeTruthy();
    await gate.settle(id!, 0.0004);
    expect((await gate.check()).remainingUsd).toBeCloseTo(0.0096);
    await expect(gate.settle(id!, 0)).rejects.toThrow();
    await expect(gate.reserve('other-key', 0.001)).resolves.toBeNull();
  });

  it('keeps the verified key and cap immutable when caller configuration changes', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => response());
    const config = options(fetcher as typeof fetch);
    const gate = createOpenRouterChatSpendGate(config);
    config.apiKey = 'different-key';
    config.maxAccountLimitUsd = 1;
    config.maxRequestCostUsd = 1;
    await gate.check();
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer dedicated-chat-key' });
    expect(gate.maxRequestCostUsd).toBe(0.001);
  });

  it('fails promptly on an oversized key response even when stream cancellation never settles', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(16385)); },
      cancel() { return new Promise<void>(() => {}); },
    });
    const gate = createOpenRouterChatSpendGate(options(vi.fn(async () => new Response(stream, { status: 200 })) as typeof fetch));
    const result = gate.check().then(() => 'accepted', () => 'rejected');
    await expect(Promise.race([result, new Promise(resolve => setTimeout(() => resolve('hung'), 100))]))
      .resolves.toBe('rejected');
  });
});
