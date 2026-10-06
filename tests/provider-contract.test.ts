import { describe, expect, it, vi } from 'vitest';
import { checkClaimWithJev } from '../src/providers/typesafe';

const input = { claim: 'The project has 1,179 flats.', quote: '1,179 flats', passage: 'The project has 1,179 flats in six blocks.' };

describe('direct Jev claim check', () => {
  it('abstains without a key and makes no request', async () => {
    const fetcher = vi.fn();
    expect(await checkClaimWithJev(input, { apiKey: '', fetcher })).toMatchObject({ verdict: 'review', reason: 'provider_unavailable' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects an absent quote and unsupported number before calling a model', async () => {
    const fetcher = vi.fn();
    expect(await checkClaimWithJev({ ...input, quote: '2,000 flats' }, { apiKey: 'test', fetcher })).toMatchObject({ verdict: 'not_established' });
    expect(await checkClaimWithJev({ ...input, claim: 'The project has 2,000 flats.' }, { apiKey: 'test', fetcher })).toMatchObject({ verdict: 'not_established' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects impossible calendar dates before calling a model', async () => {
    const fetcher = vi.fn();
    const dated = { claim: 'Completed on 2025-02-30.', quote: '2025-02-30', passage: 'Completed on 2025-02-30.' };
    expect(await checkClaimWithJev(dated, { apiKey: 'test', fetcher })).toMatchObject({ verdict: 'not_established', reason: 'invalid_date' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('sends a bounded Choice request and accepts a valid answer only above threshold', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: 'jev-1.13.0', answers: { claim_support: { type: 'choice', choice: 'supported', confidence: 0.91, probabilities: { supported: 0.91, contradicted: 0.03, not_established: 0.06 } } } }), { status: 200 }));
    expect(await checkClaimWithJev(input, { apiKey: 'test', fetcher })).toMatchObject({ verdict: 'review', suggestion: 'supported', reason: 'unbenchmarked_positive', provider: 'typesafe_jev', model: 'jev-1.13.0' });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.typesafe.ai/v1/systemone');
    expect(options.headers.Authorization).toBe('Bearer test');
    const body = JSON.parse(options.body);
    expect(body.model).toBe('jev-1.13.0');
    expect(body.questions.claim_support.type).toBe('choice');
    expect(Object.keys(body.questions.claim_support.criteria)).toEqual(['supported', 'contradicted', 'not_established']);
  });

  it('routes low confidence, invalid model, bad responses, and network errors to review', async () => {
    for (const response of [
      new Response(JSON.stringify({ model: 'jev-1.13.0', answers: { claim_support: { type: 'choice', choice: 'supported', confidence: 0.4, probabilities: { supported: 0.8, contradicted: 0.1, not_established: 0.1 } } } }), { status: 200 }),
      new Response(JSON.stringify({ model: 'unexpected', answers: { claim_support: { type: 'choice', choice: 'supported', confidence: 0.99, probabilities: { supported: 0.9, contradicted: 0.05, not_established: 0.05 } } } }), { status: 200 }),
      new Response('unauthorized', { status: 401 }),
    ]) {
      expect(await checkClaimWithJev(input, { apiKey: 'test', fetcher: vi.fn().mockResolvedValue(response) })).toMatchObject({ verdict: 'review' });
    }
    expect(await checkClaimWithJev(input, { apiKey: 'test', fetcher: vi.fn().mockRejectedValue(new Error('offline')) })).toMatchObject({ verdict: 'review' });
  });

  it('rejects missing or inconsistent Choice probabilities', async () => {
    for (const probabilities of [undefined, { supported: 0.1, contradicted: 0.8, not_established: 0.1 }, { supported: 0.8, contradicted: 0.8, not_established: 0.1 }]) {
      const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: 'jev-1.13.0', answers: { claim_support: { type: 'choice', choice: 'supported', confidence: 0.95, probabilities } } }), { status: 200 }));
      expect(await checkClaimWithJev(input, { apiKey: 'test', fetcher })).toMatchObject({ verdict: 'review', reason: 'invalid_response' });
    }
  });

  it('uses the real Jev System One API through OpenRouter when configured', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: 'typesafe/jev-1.13-20260917', answers: { claim_support: { type: 'choice', choice: 'supported', confidence: 1, probabilities: { supported: 1, contradicted: 0, not_established: 0 } } }, usage: { cost: 0.000016968 } }), { status: 200 }));
    expect(await checkClaimWithJev(input, { openRouterApiKey: 'openrouter-test', fetcher })).toMatchObject({ verdict: 'review', suggestion: 'supported', provider: 'openrouter_jev', model: 'typesafe/jev-1.13-20260917' });
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/systemone');
    expect(options.headers.Authorization).toBe('Bearer openrouter-test');
    expect(JSON.parse(options.body).model).toBe('typesafe/jev-1.13-20260917');
  });

  it('honors an explicitly supplied direct key even when an OpenRouter key is also supplied', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: 'jev-1.13.0', answers: { claim_support: { type: 'choice', choice: 'not_established', confidence: 0.9, probabilities: { supported: 0.05, contradicted: 0.05, not_established: 0.9 } } } }), { status: 200 }));
    expect(await checkClaimWithJev(input, { apiKey: 'direct-test', openRouterApiKey: 'openrouter-test', fetcher })).toMatchObject({ provider: 'typesafe_jev' });
    expect(fetcher.mock.calls[0][0]).toBe('https://api.typesafe.ai/v1/systemone');
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer direct-test');
  });

  it('abstains if OpenRouter serves a different dated model', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ model: 'typesafe/jev-1.13-20261001', answers: { claim_support: { type: 'choice', choice: 'supported', confidence: 1, probabilities: { supported: 1, contradicted: 0, not_established: 0 } } } }), { status: 200 }));
    expect(await checkClaimWithJev(input, { openRouterApiKey: 'test', fetcher })).toMatchObject({ verdict: 'review', reason: 'invalid_response' });
  });
});
