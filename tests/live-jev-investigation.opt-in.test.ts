import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { runJevAssistedInvestigation } from '../src/providers/jev-assisted-investigation';

const read = (path: string) => JSON.parse(readFileSync(resolve(path), 'utf8'));
function localKey(name: string): string {
  const line = readFileSync(resolve('.env.local'), 'utf8').split(/\r?\n/).find(value => value.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '') ?? '';
}

it.skipIf(process.env.RUN_LIVE_JEV_INVESTIGATION !== '1')('runs one capped Jev-assisted checked-replay canary', async () => {
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
  const result = await runJevAssistedInvestigation(snapshot, snapshot.clusters[0].id,
    { area: async () => roleOutput, market: async () => roleOutput, challenger: async () => roleOutput },
    { benchmarkApiKey: localKey('OPENROUTER_BENCHMARK_API_KEY'), generalApiKey: localKey('OPENROUTER_API_KEY') });
  expect(result.decision.outcome).toBe('insufficient_evidence');
  expect(result.jev.attemptedChecks).toBeLessThanOrEqual(1);
  const observedAt = new Date().toISOString();
  const saved = { observedAt, kind: 'checked_replay_jev_canary', status: result.status,
    elapsedMs: result.elapsedMs, outcome: result.decision.outcome,
    jev: { available: result.jev.available, attemptedChecks: result.jev.attemptedChecks,
      checkedClaims: result.jev.checkedClaims, knownReportedCostUsd: result.jev.knownReportedCostUsd,
      unknownChargeChecks: result.jev.unknownChargeChecks, reportedCostUsd: result.jev.reportedCostUsd,
      reviewRequired: result.jev.reviewRequired } };
  writeFileSync(resolve('outputs', `JEV_INVESTIGATION_CANARY_${observedAt.replace(/[:.]/g, '-')}.json`),
    `${JSON.stringify(saved, null, 2)}\n`, { flag: 'wx' });
}, 40_000);
