import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { expect, it } from 'vitest';
import { decideReviewedCluster, decideReviewedClusterWithInvestigation } from '../src/engine/decision';

const read = (path: string) => JSON.parse(readFileSync(resolve(path), 'utf8'));

it.skipIf(process.env.RUN_JEV_REPLAY_BASELINE !== '1')('measures the same fixed roles without Jev or network calls', async () => {
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
  const durations: number[] = [];
  for (let i = 0; i < 5; i++) {
    const started = performance.now();
    decideReviewedCluster(snapshot, snapshot.clusters[0].id);
    const outputs = await Promise.all([Promise.resolve(roleOutput), Promise.resolve(roleOutput), Promise.resolve(roleOutput)]);
    const decision = decideReviewedClusterWithInvestigation(snapshot, snapshot.clusters[0].id,
      { maxCalls: 3, assignments: (['area', 'market', 'challenger'] as const).map((role, index) =>
        ({ role, run: () => outputs[index] })) });
    expect(decision.outcome).toBe('insufficient_evidence');
    durations.push(performance.now() - started);
  }
  const observedAt = new Date().toISOString();
  const ordered = [...durations].sort((a, b) => a - b);
  const saved = { observedAt, kind: 'fixed_role_replay_without_jev', repetitions: durations.length,
    medianElapsedMs: ordered[2], minElapsedMs: ordered[0], maxElapsedMs: ordered[4],
    outcome: 'insufficient_evidence', externalCalls: 0, externalCostUsd: 0 };
  writeFileSync(resolve('outputs', `JEV_REPLAY_BASELINE_${observedAt.replace(/[:.]/g, '-')}.json`),
    `${JSON.stringify(saved, null, 2)}\n`, { flag: 'wx' });
}, 40_000);
