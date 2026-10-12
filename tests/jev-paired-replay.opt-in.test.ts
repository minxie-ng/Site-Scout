import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { measureReviewedInvestigationWithoutJev, runJevAssistedInvestigation } from '../src/providers/jev-assisted-investigation';
import { singleJevRequestFetcher } from './jev-one-call-guard';

const read = (path: string) => JSON.parse(readFileSync(resolve(path), 'utf8'));
function localKey(name: string): string {
  const line = readFileSync(resolve('.env.local'), 'utf8').split(/\r?\n/).find(value => value.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '') ?? '';
}

it.skipIf(process.env.RUN_JEV_PAIRED_REPLAY !== '1')('compares the shared checked replay with one capped Jev call', async () => {
  const snapshot = {
    clusters: ['block-cluster.json', 'punggol-sapphire-cluster.json', 'punggol-ripples-cluster.json']
      .map(name => read(`src/data/snapshots/2026-10-06/${name}`)),
    competitorLeads: read('src/data/snapshots/2026-10-06/competitor-leads.json'),
    development: read('src/data/snapshots/2026-10-05/developments.json'),
    factorFeed: read('prototype/data.json'),
  };
  const claim = snapshot.development.decisionClaims[0];
  const roleOutput = { claims: [{ text: claim.claim, evidenceIds: claim.sourceIds, evidenceExcerpt: claim.evidenceExcerpt }],
    conflicts: [], unknowns: [], nextInvestigation: 'Verify the phase-to-block relationship.' };
  const roles = () => ({ area: async () => roleOutput, market: async () => roleOutput,
    challenger: async () => roleOutput });
  const baseline = await measureReviewedInvestigationWithoutJev(snapshot, snapshot.clusters[0].id, roles());
  expect(baseline.status).toBe('benchmark_without_jev');
  expect(baseline.decision.outcome).toBe('insufficient_evidence');
  const checkedClaims = baseline.decision.investigation.claims.filter(item => item.verdict === 'supported');
  const uniqueCandidateClaims = new Set(checkedClaims.map(item =>
    JSON.stringify([item.text, item.evidenceIds[0], item.evidenceExcerpt]))).size;
  expect(uniqueCandidateClaims).toBe(1);
  const guarded = singleJevRequestFetcher(fetch);
  const withJev = await runJevAssistedInvestigation(snapshot, snapshot.clusters[0].id, roles(), {
    benchmarkApiKey: localKey('OPENROUTER_BENCHMARK_API_KEY'),
    generalApiKey: localKey('OPENROUTER_API_KEY'),
    fetcher: guarded.fetcher,
  });
  expect(guarded.getJevRequestCount()).toBeLessThanOrEqual(1);
  expect(withJev.decision.outcome).toBe('insufficient_evidence');
  expect(withJev.jev.attemptedChecks).toBeLessThanOrEqual(1);
  const observedAt = new Date().toISOString();
  const report = { observedAt, kind: 'same_path_fixed_role_replay', roleCallsPerArm: 3,
    sourceClaimEntriesPerArm: checkedClaims.length, uniqueCandidateClaims,
    withoutJev: { status: baseline.status, elapsedMs: baseline.elapsedMs, outcome: baseline.decision.outcome,
      externalCalls: 0, externalCostUsd: 0 },
    withJev: { status: withJev.status, elapsedMs: withJev.elapsedMs, outcome: withJev.decision.outcome,
      attemptedChecks: withJev.jev.attemptedChecks, checkedClaims: withJev.jev.checkedClaims,
      reportedCostUsd: withJev.jev.reportedCostUsd, unknownChargeChecks: withJev.jev.unknownChargeChecks,
      reviewRequired: withJev.jev.reviewRequired },
    interpretation: 'Fixed local role outputs; one sequential sample per arm; no live role-generation or product latency claim.' };
  writeFileSync(resolve('outputs', `JEV_PAIRED_REPLAY_${observedAt.replace(/[:.]/g, '-')}.json`),
    `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
}, 40_000);
