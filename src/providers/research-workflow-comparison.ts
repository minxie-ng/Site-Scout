import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { decideReviewedClusterWithInvestigation } from '../engine/decision';

const casesSchema = z.array(z.object({
  id: z.string().min(1).max(160).refine(id => id === id.trim()),
  toolStatus: z.enum(['ok', 'failed', 'stale']),
  output: z.unknown(),
}).strict()).min(1).max(30);

/** Identical scripted observations, not a live-agent benchmark or a sandbox for callbacks. */
export function compareReviewedResearchWorkflows(
  input: Parameters<typeof decideReviewedClusterWithInvestigation>[0],
  clusterId: string,
  casesInput: unknown,
) {
  let cases;
  try {
    cases = casesSchema.parse(structuredClone(casesInput));
    if (new Set(cases.map(item => item.id)).size !== cases.length) throw new Error('Duplicate case');
  } catch { throw new Error('Invalid comparison cases'); }
  const snapshot = structuredClone(input);
  const run = (item: typeof cases[number], roles: string[]) => {
    const start = performance.now();
    const decision = decideReviewedClusterWithInvestigation(snapshot, clusterId, {
      maxCalls: 3,
      assignments: roles.map(role => ({ role, toolStatus: item.toolStatus, run: () => structuredClone(item.output) })),
    });
    const latencyMs = performance.now() - start;
    // Evidence coverage is checked support, not citation count or repeated role agreement.
    const uniqueCheckedEvidenceIds = [...new Set(decision.investigation.claims
      .filter(claim => claim.verdict === 'supported')
      .flatMap(claim => claim.citedSources.map(source => source.id)))].sort();
    return { decision, callsConsumed: decision.investigation.callsUsed, uniqueCheckedEvidenceIds,
      claimsAdmittedToCalculation: 0, unsupportedClaimsAdmitted: 0,
      latencyMs, externalModelCalls: 0, externalToolCalls: 0, measuredCostUsd: 0 };
  };
  const results = cases.map(item => ({ id: item.id,
    baseline: run(item, ['baseline']), roles: run(item, ['area', 'market', 'challenger']) }));
  const total = (arm: 'baseline' | 'roles') => ({
    callsConsumed: results.reduce((sum, item) => sum + item[arm].callsConsumed, 0),
    uniqueCheckedEvidenceIds: [...new Set(results.flatMap(item => item[arm].uniqueCheckedEvidenceIds))].sort(),
    unsupportedClaimsAdmitted: results.reduce((sum, item) => sum + item[arm].unsupportedClaimsAdmitted, 0),
    claimsAdmittedToCalculation: 0,
    latencyMs: results.reduce((sum, item) => sum + item[arm].latencyMs, 0),
    externalModelCalls: 0, externalToolCalls: 0, measuredCostUsd: 0,
  });
  return { kind: 'scripted_offline_rehearsal' as const, sameCasesAndEvidence: true,
    maxCallsPerArm: 3, automaticPositiveAcceptance: false, superiorityEstablished: false,
    evidenceProvenance: 'checked_dated_replay' as const, caseProvenance: 'synthetic_fixture' as const,
    latencyScope: 'local_synchronous_decision_bridge_including_validation' as const,
    costScope: 'no_external_requests_not_live_agent_billing' as const,
    cases: results, total: { baseline: total('baseline'), roles: total('roles') } };
}
