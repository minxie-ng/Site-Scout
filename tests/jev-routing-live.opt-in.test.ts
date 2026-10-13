import { readFileSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { compareJevResearchRouting } from '../src/providers/jev-task-routing';
import { singleJevRequestFetcher } from './jev-one-call-guard';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

it.skipIf(process.env.RUN_LIVE_JEV_ROUTING !== '1')('measures one capped Jev routing call against fixed roles', async () => {
  const dedicated = process.env.OPENROUTER_BENCHMARK_API_KEY ?? '';
  const general = process.env.OPENROUTER_API_KEY ?? '';
  expect(dedicated && general && dedicated !== general).toBe(true);
  const snapshot = {
    clusters: ['block-cluster.json', 'punggol-sapphire-cluster.json', 'punggol-ripples-cluster.json']
      .map(name => read(`src/data/snapshots/2026-10-06/${name}`)),
    competitorLeads: read('src/data/snapshots/2026-10-06/competitor-leads.json'),
    development: read('src/data/snapshots/2026-10-05/developments.json'),
    factorFeed: read('prototype/data.json'),
  };
  const checkedClaim = snapshot.development.decisionClaims[0];
  const output = () => ({ claims: [{ text: checkedClaim.claim, evidenceIds: checkedClaim.sourceIds,
    evidenceExcerpt: checkedClaim.evidenceExcerpt }], conflicts: [],
    unknowns: ['No verified cluster-level rent, use, demand or competitor catchment.'],
    nextInvestigation: 'Verify a specific premises and local market.' });
  const roles = () => ({ area: async () => output(), market: async () => output(), challenger: async () => output() });
  const guarded = singleJevRequestFetcher(fetch);
  const result = await compareJevResearchRouting(snapshot, snapshot.clusters[0].id, roles,
    { benchmarkApiKey: dedicated, generalApiKey: general, fetcher: guarded.fetcher });
  expect(guarded.getJevRequestCount()).toBe(1);
  expect(result.fixed.decision.outcome).toBe('insufficient_evidence');
  expect(result.routed.decision.outcome).toBe('insufficient_evidence');
  expect(result.fixed.callsUsed).toBe(3);
  expect(result.routed.callsUsed).toBe(3);
  const report = { kind: result.kind, snapshotDate: '2026-10-06', recordedAt: new Date().toISOString(),
    caseId: snapshot.clusters[0].id, sameCaseAndEvidence: result.sameCaseAndEvidence,
    maxRoleCallsPerArm: result.maxRoleCallsPerArm, jevRequests: guarded.getJevRequestCount(),
    speedBenefitEstablished: false,
    fixed: { elapsedMs: result.fixed.elapsedMs, callsUsed: result.fixed.callsUsed,
      outcome: result.fixed.decision.outcome, reportedCostUsd: 0,
      supportedClaims: result.fixed.decision.investigation.coverage.uniqueSupportedClaims },
    routed: { elapsedMs: result.routed.elapsedMs, callsUsed: result.routed.callsUsed,
      status: result.routed.status, selectedTask: result.routed.selectedTask,
      outcome: result.routed.decision.outcome, reportedCostUsd: result.routed.reportedCostUsd,
      supportedClaims: result.routed.decision.investigation.coverage.uniqueSupportedClaims } };
  const path = `outputs/JEV_ROUTING_CANARY_${report.recordedAt.replace(/[:.]/g, '-')}.json`;
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  console.info(`Credential-free Jev routing report: ${path}`);
});
