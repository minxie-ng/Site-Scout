import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import * as evidence from '../src/domain/evidence';
import { singleJevRequestFetcher } from './jev-one-call-guard';
import { measureReviewedInvestigationWithoutJev, runJevAssistedInvestigation } from '../src/providers/jev-assisted-investigation';

const read = (path: string) => JSON.parse(readFileSync(resolve(path), 'utf8'));
const input = () => ({
  clusters: ['block-cluster.json', 'punggol-sapphire-cluster.json', 'punggol-ripples-cluster.json']
    .map(name => read(`src/data/snapshots/2026-10-06/${name}`)),
  competitorLeads: read('src/data/snapshots/2026-10-06/competitor-leads.json'),
  development: read('src/data/snapshots/2026-10-05/developments.json'),
  factorFeed: read('prototype/data.json'),
});
const output = (record: ReturnType<typeof input>['development']) => {
  const claim = record.decisionClaims[0];
  return { claims: [{ text: claim.claim, evidenceIds: claim.sourceIds, evidenceExcerpt: claim.evidenceExcerpt }],
    conflicts: [], unknowns: [], nextInvestigation: 'Verify the phase-to-block relationship.' };
};
const roles = (record: ReturnType<typeof input>['development']) => ({
  area: vi.fn(async () => output(record)), market: vi.fn(async () => output(record)),
  challenger: vi.fn(async () => output(record)),
});
const answer = (choice: 'supported' | 'contradicted' | 'not_established' = 'supported', cost = 0.00001) => ({
  model: 'typesafe/jev-1.13-20260917', usage: { cost }, answers: { claim_support: {
    type: 'choice', choice, confidence: 0.95,
    probabilities: choice === 'supported' ? { supported: 0.95, contradicted: 0.03, not_established: 0.02 } :
      { supported: 0.03, contradicted: choice === 'contradicted' ? 0.95 : 0.02,
        not_established: choice === 'not_established' ? 0.95 : 0.02 },
  } },
});
const budget = () => new Response(JSON.stringify({ data: { limit: 0.01, limit_remaining: 0.01,
  usage: 0, limit_reset: null } }));
const transport = (body = answer()) => vi.fn(async (url: string | URL | Request) =>
  String(url).endsWith('/key') ? budget() : new Response(JSON.stringify(body)));
const options = (fetcher: typeof fetch, extras: Record<string, unknown> = {}) => ({
  benchmarkApiKey: 'dedicated', generalApiKey: 'general', fetcher, ...extras,
});

describe('Jev-assisted investigation boundary', () => {
  it('blocks a second Jev request before network dispatch in a capped replay', async () => {
    const network = vi.fn(async () => new Response('{}')) as unknown as typeof fetch;
    const guarded = singleJevRequestFetcher(network);
    await guarded.fetcher('https://openrouter.ai/api/v1/systemone', { method: 'POST' });
    await expect(guarded.fetcher('https://openrouter.ai/api/v1/systemone', { method: 'POST' }))
      .rejects.toThrow('One Jev request limit');
    expect(guarded.getJevRequestCount()).toBe(1);
    expect(network).toHaveBeenCalledOnce();
  });

  it('rejects all unexpected URLs and methods before a capped replay dispatches network calls', async () => {
    const network = vi.fn(async () => new Response('{}')) as unknown as typeof fetch;
    const guarded = singleJevRequestFetcher(network);
    for (const [url, init] of [
      ['https://other.example/api/v1/systemone', { method: 'POST' }],
      ['https://openrouter.ai/api/v1/chat/completions', { method: 'POST' }],
      ['https://openrouter.ai/api/v1/systemone', { method: 'GET' }],
      ['https://openrouter.ai/api/v1/key', { method: 'POST' }],
    ] as const) await expect(guarded.fetcher(url, init)).rejects.toThrow('Unapproved Jev replay endpoint');
    expect(network).not.toHaveBeenCalled();
  });
  it('runs the same checked roles and decision path without Jev for a benchmark-only baseline', async () => {
    const snapshot = input();
    const baselineRoles = roles(snapshot.development);
    const baseline = await measureReviewedInvestigationWithoutJev(snapshot, snapshot.clusters[0].id, baselineRoles);
    const jevRoles = roles(snapshot.development);
    const fetcher = transport() as unknown as typeof fetch;
    const withJev = await runJevAssistedInvestigation(snapshot, snapshot.clusters[0].id, jevRoles, options(fetcher));
    expect(baseline).toMatchObject({ status: 'benchmark_without_jev', decision: { outcome: 'insufficient_evidence' },
      jev: { attemptedChecks: 0, reportedCostUsd: 0 } });
    expect(baseline.decision.investigation.claims.map(claim => claim.text))
      .toEqual(withJev.decision.investigation.claims.map(claim => claim.text));
    expect(Object.values(baselineRoles).every(fn => fn.mock.calls.length === 1)).toBe(true);
    expect(Object.values(jevRoles).every(fn => fn.mock.calls.length === 1)).toBe(true);
    expect(fetcher).toHaveBeenCalled();
  });

  it.each([null, 'A different passage without the quoted excerpt.'])(
    'fails the benchmark closed when the checked passage changes to %s before the Jev boundary', async passage => {
    const snapshot = input();
    const spy = vi.spyOn(evidence, 'readReviewedExtraction').mockReturnValue(passage);
    try {
      const result = await measureReviewedInvestigationWithoutJev(snapshot, snapshot.clusters[0].id,
        roles(snapshot.development));
      expect(result).toMatchObject({ status: 'degraded', jev: { reason: 'checked_passage_unavailable' } });
    } finally { spy.mockRestore(); }
  });

  it('checks one deduplicated source-bound claim with the same capped key and preserves abstention', async () => {
    const snapshot = input();
    const calls: Array<{ url: string; auth: string; signal?: AbortSignal }> = [];
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), auth: String((init?.headers as Record<string, string>)?.Authorization), signal: init?.signal as AbortSignal });
      return String(url).endsWith('/key') ? budget() : new Response(JSON.stringify(answer()));
    }) as unknown as typeof fetch;
    const runners = roles(snapshot.development);
    const result = await runJevAssistedInvestigation(snapshot, snapshot.clusters[0].id, runners, options(fetcher));
    expect(runners.area).toHaveBeenCalledOnce();
    expect(runners.market).toHaveBeenCalledOnce();
    expect(runners.challenger).toHaveBeenCalledOnce();
    expect(calls.some(call => call.url.endsWith('/key'))).toBe(true);
    expect(calls.filter(call => call.url.endsWith('/systemone'))).toHaveLength(1);
    expect(calls.every(call => call.auth === 'Bearer dedicated')).toBe(true);
    expect(result).toMatchObject({ status: 'jev_assisted', decision: { outcome: 'insufficient_evidence' },
      jev: { attemptedChecks: 1, checkedClaims: 1, reportedCostUsd: 0.00001, reviewRequired: true } });
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('validates the source before either role or Jev call', async () => {
    const snapshot = input(); snapshot.development.sources[0].sourceUrl = 'https://example.com/false';
    const runners = roles(snapshot.development); const fetcher = transport() as unknown as typeof fetch;
    const result = await runJevAssistedInvestigation(snapshot, snapshot.clusters[0].id, runners, options(fetcher));
    expect(result).toMatchObject({ status: 'invalid_source', decision: { outcome: 'insufficient_evidence' } });
    expect(Object.values(runners).every(fn => fn.mock.calls.length === 0)).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('discloses a capped-key failure without sending Jev and retains the source decision', async () => {
    const snapshot = input();
    const fetcher = vi.fn(async (url: string | URL | Request) => String(url).endsWith('/key') ?
      new Response(JSON.stringify({ data: { limit: 0.2, limit_remaining: 0.2, usage: 0, limit_reset: null } })) :
      new Response(JSON.stringify(answer()))) as unknown as typeof fetch;
    const result = await runJevAssistedInvestigation(snapshot, snapshot.clusters[0].id,
      roles(snapshot.development), options(fetcher));
    expect(result).toMatchObject({ status: 'degraded', jev: { attemptedChecks: 0 } });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(() => runJevAssistedInvestigation(snapshot, snapshot.clusters[0].id,
      roles(snapshot.development), { benchmarkApiKey: 'general', generalApiKey: 'general', fetcher })).toThrow();
  });

  it('shows a Jev disagreement as review required, without rewriting checked source evidence', async () => {
    const snapshot = input();
    const result = await runJevAssistedInvestigation(snapshot, snapshot.clusters[0].id,
      roles(snapshot.development), options(transport(answer('contradicted')) as unknown as typeof fetch));
    expect(result).toMatchObject({ status: 'jev_assisted', decision: { outcome: 'insufficient_evidence' },
      jev: { checks: [{ sourceVerdict: 'supported', jevVerdict: 'contradicted', reviewRequired: true }] } });
    expect(result.decision.nextInvestigations).toContain('Review Jev-disputed source claims against the checked original.');
  });

  it('degrades malformed cost or verdict and keeps known cost separate from unknown charge', async () => {
    const snapshot = input();
    for (const bad of [answer('supported', -1), { ...answer(), answers: { claim_support: { ...answer().answers.claim_support,
      choice: 'invented' } } }]) {
      const result = await runJevAssistedInvestigation(snapshot, snapshot.clusters[0].id,
        roles(snapshot.development), options(transport(bad as any) as unknown as typeof fetch));
      expect(result).toMatchObject({ status: 'degraded', decision: { outcome: 'insufficient_evidence' },
        jev: { available: false, checkedClaims: 0, reviewRequired: true } });
    }
  });

  it('aborts a timed-out Jev fetch and leaves the possible charge unknown', async () => {
    const snapshot = input();
    let jevSignal: AbortSignal | undefined;
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith('/key')) return budget();
      jevSignal = init?.signal as AbortSignal;
      return new Promise<Response>(() => undefined);
    }) as unknown as typeof fetch;
    const result = await runJevAssistedInvestigation(snapshot, snapshot.clusters[0].id,
      roles(snapshot.development), options(fetcher, { jevTimeoutMs: 5 }));
    expect(jevSignal?.aborted).toBe(true);
    expect(result).toMatchObject({ status: 'degraded', jev: { attemptedChecks: 1, checkedClaims: 0,
      unknownChargeChecks: 1, reportedCostUsd: null } });
  });
});
