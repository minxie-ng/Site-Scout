import { describe, expect, it, vi } from 'vitest';
import { createOpenRouterAsyncResearchCaller } from '../src/providers/openrouter-async-research';
import type { AsyncResearchCallRequest } from '../src/providers/async-research-comparison';

const request = (signal = new AbortController().signal): AsyncResearchCallRequest => ({
  caseId: 'checked_context', arm: 'baseline', role: 'baseline', requestedModel: 'test/model',
  protocol: 'site-scout-research-v1', systemInstruction: 'Fixed system', roleInstruction: 'Fixed role',
  outputContract: '{"claims":[]}', caseData: '{"checked":true}', evidenceHash: 'a'.repeat(64),
  evidenceIds: ['checked-id'], maxOutputTokens: 1200, signal,
});
const body = (cost = 0.0002, model = 'test/model') => ({ model, choices: [{ finish_reason: 'stop',
  message: { content: JSON.stringify({ claims: [], conflicts: [], unknowns: [], nextInvestigation: 'Verify rent.' }) } }],
  usage: { prompt_tokens: 30, completion_tokens: 10, cost } });
const options = (fetcher: typeof fetch) => ({ apiKey: 'test-key', fetcher, maxPromptBytes: 8192, maxRequestCostUsd: 0.001 });

describe('OpenRouter async research transport', () => {
  it('sends fixed no-tools protocol and retains served model and reported cost', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(body()), { status: 200 }));
    const caller = createOpenRouterAsyncResearchCaller(options(fetcher as typeof fetch));
    await expect(caller(request())).resolves.toMatchObject({ status: 'ok', provider: 'openrouter',
      model: 'test/model', reportedCostUsd: 0.0002, output: { claims: [] } });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.signal).toBeDefined();
    const sent = JSON.parse(init.body as string);
    expect(sent).toMatchObject({ model: 'test/model', stream: false, temperature: 0,
      max_completion_tokens: 1200, response_format: { type: 'json_object' } });
    expect(sent.reasoning).toBeUndefined();
    expect(sent.tools).toBeUndefined();
    expect(sent.messages).toEqual([
      { role: 'system', content: 'Fixed system' },
      { role: 'user', content: JSON.stringify({ task: 'Fixed role', caseData: '{"checked":true}',
        outputContract: '{"claims":[]}', evidenceHash: 'a'.repeat(64), evidenceIds: ['checked-id'] }) },
    ]);
  });

  it('keeps failed, malformed and model-mismatched charges unknown or known without fabricating success', async () => {
    const failed = createOpenRouterAsyncResearchCaller(options(vi.fn(async () => new Response('server error', { status: 503 })) as typeof fetch));
    await expect(failed(request())).resolves.toMatchObject({ status: 'failed', reportedCostUsd: null });
    const mismatch = createOpenRouterAsyncResearchCaller(options(vi.fn(async () => new Response(JSON.stringify(body(0.0002, 'other/model')), { status: 200 })) as typeof fetch));
    await expect(mismatch(request())).resolves.toMatchObject({ status: 'failed', model: 'other/model', reportedCostUsd: 0.0002 });
    const malformed = createOpenRouterAsyncResearchCaller(options(vi.fn(async () => new Response(JSON.stringify({ ...body(), choices: [] }), { status: 200 })) as typeof fetch));
    await expect(malformed(request())).resolves.toMatchObject({ status: 'failed', reportedCostUsd: 0.0002 });
  });

  it('labels truncated output distinctly while retaining its reported charge', async () => {
    const truncated = body();
    truncated.choices[0].finish_reason = 'length';
    const caller = createOpenRouterAsyncResearchCaller(options(
      vi.fn(async () => new Response(JSON.stringify(truncated), { status: 200 })) as typeof fetch));
    await expect(caller(request())).resolves.toMatchObject({ status: 'failed', reason: 'output_truncated',
      reportedCostUsd: 0.0002 });
  });

  it('passes caller cancellation to fetch and never retries or treats abort as zero billing', async () => {
    const controller = new AbortController();
    const fetcher = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }));
    const pending = createOpenRouterAsyncResearchCaller(options(fetcher as typeof fetch))(request(controller.signal));
    controller.abort();
    await expect(pending).resolves.toMatchObject({ status: 'failed', reportedCostUsd: null });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not hang when an oversized response stream refuses to finish cancellation', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(65537)); },
      cancel() { return new Promise<void>(() => {}); },
    });
    const fetcher = vi.fn(async () => new Response(stream, { status: 200 }));
    const result = createOpenRouterAsyncResearchCaller(options(fetcher as typeof fetch))(request());
    await expect(Promise.race([result, new Promise(resolve => setTimeout(() => resolve('hung'), 100))]))
      .resolves.toMatchObject({ status: 'failed', reason: 'invalid_response', reportedCostUsd: null });
  });
});
