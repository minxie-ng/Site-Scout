import { parseDevelopmentRecord } from '../domain/evidence';
import { reviewResearchOutput } from './research-review';

export type ResearchRole = 'area' | 'market' | 'challenger';
type Assignment = { role: string; run: () => unknown; toolStatus?: 'ok' | 'failed' | 'stale' };
type Request = { maxCalls: number; assignments: Assignment[] };

/** A bounded, offline rehearsal over scripted role outputs. */
export function runBoundedInvestigation(record: unknown, request: Request) {
  if (!request || typeof request !== 'object' || !Array.isArray(request.assignments)) throw new Error('Invalid research request');
  if (!Number.isSafeInteger(request.maxCalls) || request.maxCalls < 1 || request.maxCalls > 3 ||
    request.assignments.length > request.maxCalls || request.assignments.length < 1) throw new Error('Invalid call budget');
  for (let index = 0; index < request.assignments.length; index++) {
    const item = request.assignments[index];
    if (!Object.hasOwn(request.assignments, index) || !item || typeof item !== 'object' || typeof item.role !== 'string' || typeof item.run !== 'function') {
      throw new Error('Invalid research assignments');
    }
  }
  if (request.assignments.some(item => item.toolStatus !== undefined && !['ok', 'failed', 'stale'].includes(item.toolStatus))) throw new Error('Invalid tool status');
  const assignments = request.assignments.map(item => ({ role: item.role, run: item.run, toolStatus: item.toolStatus }));
  const roles = assignments.map(item => item.role);
  if (roles.some(role => !['area', 'market', 'challenger', 'baseline'].includes(role)) || new Set(roles).size !== roles.length ||
    (roles.includes('baseline') && roles.length !== 1)) throw new Error('Invalid research roles');

  const base = { decision: 'insufficient_evidence' as const, maxCalls: request.maxCalls };
  const parsed = parseDevelopmentRecord(record);
  if (!parsed.success) return {
    ...base, callsUsed: 0, coverage: { supportedClaims: 0, reviewedClaims: 0, rolesCompleted: 0, uniqueSupportedClaims: 0, uniqueUnresolvedClaims: 0 }, unresolvedClaims: 0, claims: [],
    conflicts: [], unknowns: ['Reviewed source is unavailable.'], nextInvestigations: ['Restore and validate the source snapshot.'],
    failures: [{ role: 'source', reason: 'invalid_source' as const }],
  };
  const reviewedSnapshot = structuredClone(parsed.data);

  const reviews: Array<Extract<ReturnType<typeof reviewResearchOutput>, { status: 'research_only' }>> = [];
  const claims: Array<Extract<ReturnType<typeof reviewResearchOutput>, { status: 'research_only' }>['claims'][number] & { role: string }> = [];
  const failures: Array<{ role: string; reason: 'tool_failed' | 'stale_evidence' | 'invalid_research_output' }> = [];
  let callsUsed = 0;
  let sourceLost = false;
  for (const assignment of assignments) {
    let output: unknown;
    callsUsed++;
    const statusFailure = assignment.toolStatus === 'stale' ? 'stale_evidence' as const
      : assignment.toolStatus === 'failed' ? 'tool_failed' as const : null;
    try { output = assignment.run(); }
    catch { failures.push({ role: assignment.role, reason: statusFailure ?? 'tool_failed' }); continue; }
    try {
      if (output !== null && (typeof output === 'object' || typeof output === 'function') && typeof (output as { then?: unknown }).then === 'function') {
        void Promise.resolve(output).then(() => undefined, () => undefined);
        failures.push({ role: assignment.role, reason: statusFailure ?? 'invalid_research_output' });
        continue;
      }
    } catch { failures.push({ role: assignment.role, reason: statusFailure ?? 'invalid_research_output' }); continue; }
    if (statusFailure) { failures.push({ role: assignment.role, reason: statusFailure }); continue; }
    const review = reviewResearchOutput(reviewedSnapshot, output);
    if (review.status === 'unavailable' && review.reason === 'invalid_source') { sourceLost = true; break; }
    if (review.status === 'unavailable') failures.push({ role: assignment.role, reason: 'invalid_research_output' });
    else { reviews.push(review); claims.push(...review.claims.map(claim => ({ ...claim, role: assignment.role }))); }
  }
  const unique = (verdict: 'supported' | 'unresolved') => new Set(claims.filter(claim => verdict === 'supported' ? claim.verdict === 'supported' : claim.verdict !== 'supported')
    .map(claim => JSON.stringify([claim.text, claim.evidenceIds, claim.evidenceExcerpt]))).size;
  const conflicts = reviews.flatMap(review => review.conflicts);
  const unknowns = [...new Set([...reviews.flatMap(review => review.unknowns), ...failures.map(failure => `${failure.role} output unavailable: ${failure.reason}`), ...(sourceLost ? ['Reviewed source is unavailable.'] : [])])];
  return {
    ...base, callsUsed, claims,
    coverage: { supportedClaims: claims.filter(claim => claim.verdict === 'supported').length, reviewedClaims: claims.length, rolesCompleted: reviews.length,
      uniqueSupportedClaims: unique('supported'), uniqueUnresolvedClaims: unique('unresolved') },
    unresolvedClaims: claims.filter(claim => claim.verdict !== 'supported').length,
    conflicts, unknowns, nextInvestigations: [...new Set([
      ...reviews.map(review => review.nextInvestigation),
      ...failures.map(failure => `Retry or replace the ${failure.role} research output after ${failure.reason}.`),
      ...(sourceLost ? ['Restore and validate the source snapshot.'] : []),
    ])], failures: sourceLost ? [...failures, { role: 'source', reason: 'invalid_source' as const }] : failures,
  };
}

export function compareBoundedInvestigation(record: unknown, input: {
  maxCalls: number;
  baseline: () => unknown;
  roles: Record<ResearchRole, () => unknown>;
}) {
  if (!input || typeof input !== 'object' || typeof input.baseline !== 'function' || !input.roles ||
    typeof input.roles !== 'object' || (['area', 'market', 'challenger'] as const).some(role => typeof input.roles[role] !== 'function')) {
    throw new Error('Invalid comparison request');
  }
  const maxCalls = input.maxCalls;
  if (!Number.isSafeInteger(maxCalls) || maxCalls !== 3) throw new Error('Invalid comparison budget');
  const baselineRun = input.baseline;
  const roleRuns = (['area', 'market', 'challenger'] as const).map(role => ({ role, run: input.roles[role] }));
  let sharedSnapshot: unknown;
  try { sharedSnapshot = structuredClone(record); }
  catch { sharedSnapshot = null; }
  const baseline = runBoundedInvestigation(sharedSnapshot, { maxCalls, assignments: [{ role: 'baseline', run: baselineRun }] });
  const roles = runBoundedInvestigation(sharedSnapshot, { maxCalls, assignments: roleRuns });
  const metrics = (arm: typeof baseline) => ({ supportedClaims: arm.coverage.supportedClaims, unresolvedClaims: arm.unresolvedClaims,
    uniqueSupportedClaims: arm.coverage.uniqueSupportedClaims, uniqueUnresolvedClaims: arm.coverage.uniqueUnresolvedClaims });
  const unresolved = (arm: typeof baseline) => ({ conflicts: arm.conflicts.length, unknowns: arm.unknowns.length, failures: arm.failures.length });
  return {
    baseline, roles,
    comparison: {
      kind: 'scripted_orchestration_rehearsal' as const,
      sameRecord: true as const,
      maxCallsPerArm: maxCalls,
      callsConsumed: { baseline: baseline.callsUsed, roles: roles.callsUsed },
      coverage: { baseline: metrics(baseline), roles: metrics(roles) },
      unresolved: { baseline: unresolved(baseline), roles: unresolved(roles) },
    },
  };
}
