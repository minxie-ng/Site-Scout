import { performance } from 'node:perf_hooks';
import { parseDevelopmentRecord, readReviewedExtraction } from '../domain/evidence';
import { decideReviewedCluster, decideReviewedClusterWithInvestigation } from '../engine/decision';
import type { ClaimCheckInput, ClaimCheckResult } from './claim-check';
import type { ResearchRole } from './bounded-investigation';
import { checkClaimWithJev } from './typesafe';
import { createOpenRouterChatSpendGate } from './openrouter-chat-spend-gate';

const ROLES = ['area', 'market', 'challenger'] as const;
type Input = Parameters<typeof decideReviewedCluster>[0];
type RoleRunners = Record<ResearchRole, () => Promise<unknown>>;
const validCost = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const deadline = <T>(task: Promise<T>, ms: number, onTimeout?: () => void): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { onTimeout?.(); reject(new Error('timed_out')); }, ms);
  void task.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
});
type JevChecker = { check(input: ClaimCheckInput, options?: { signal: AbortSignal }): Promise<ClaimCheckResult> };
type JevSpendGate = { maxRequestCostUsd: number;
  check(): Promise<{ keyId: string; limitUsd: number; remainingUsd: number; resetAt: null }>;
  reserve(keyId: string, amountUsd: number): Promise<string | null>;
  settle(reservationId: string, reportedCostUsd: number): Promise<void> };

/** Live orchestration seam. Jev can challenge a checked claim, never authorize a site. */
async function runJevAssistedInvestigationCore(
  input: Input, clusterId: string, roles: RoleRunners, checker: JevChecker | null,
  options: { mode?: 'benchmark_without_jev'; roleTimeoutMs?: number; jevTimeoutMs?: number; spendGate?: JevSpendGate },
) {
  const started = performance.now();
  const safeRequest = { maxCalls: 3, assignments: ROLES.map(role => ({ role, run: () => { throw new Error('unavailable'); } })) };
  const parsed = parseDevelopmentRecord(input.development);
  if (!parsed.success) return { status: 'invalid_source' as const,
    decision: decideReviewedClusterWithInvestigation(input, clusterId, safeRequest),
    jev: { available: false, checkedClaims: 0, reportedCostUsd: 0 }, elapsedMs: performance.now() - started };
  decideReviewedCluster(input, clusterId); // Validate the cluster before any role or model call.
  const roleTimeoutMs = options.roleTimeoutMs ?? 30_000;
  const jevTimeoutMs = options.jevTimeoutMs ?? 8_000;
  if (!Number.isSafeInteger(roleTimeoutMs) || roleTimeoutMs < 1 || roleTimeoutMs > 30_000 ||
      options.mode !== 'benchmark_without_jev' && (!checker ||
        !Number.isSafeInteger(jevTimeoutMs) || jevTimeoutMs < 1 || jevTimeoutMs > 8_000 ||
        !options.spendGate || !validCost(options.spendGate.maxRequestCostUsd) ||
        options.spendGate.maxRequestCostUsd <= 0 || options.spendGate.maxRequestCostUsd > 0.00017)) {
    throw new Error('Invalid Jev budget or timeout');
  }
  const settled = await Promise.all(ROLES.map(async role => {
    try { return { role, output: await deadline(Promise.resolve().then(() => roles[role]()), roleTimeoutMs) }; }
    catch { return { role, output: null }; }
  }));
  const request = { maxCalls: 3, assignments: settled.map(({ role, output }) => ({ role,
    run: output === null ? () => { throw new Error('role unavailable'); } : () => structuredClone(output),
  })) };
  const decision = decideReviewedClusterWithInvestigation(input, clusterId, request);
  const claims = [...new Map(decision.investigation.claims.filter(claim => claim.verdict === 'supported' && claim.evidenceIds.length === 1)
    .map(claim => [JSON.stringify([claim.text, claim.evidenceIds[0], claim.evidenceExcerpt]), claim])).values()];
  if (claims.length > 3) return { status: 'degraded' as const, decision,
    jev: { available: false, checkedClaims: 0, reportedCostUsd: 0, reason: 'claim_budget_exceeded' }, elapsedMs: performance.now() - started };
  if (claims.length === 0) return { status: 'degraded' as const, decision,
    jev: { available: false, checkedClaims: 0, reportedCostUsd: 0, reason: 'no_checked_claims' }, elapsedMs: performance.now() - started };
  const passages = claims.map(claim => readReviewedExtraction(input.development, claim.evidenceIds[0]));
  if (claims.some((claim, index) => !passages[index]?.includes(claim.evidenceExcerpt))) return {
    status: 'degraded' as const, decision,
    jev: { available: false, attemptedChecks: 0, checkedClaims: 0, reportedCostUsd: 0,
      reason: 'checked_passage_unavailable' }, elapsedMs: performance.now() - started,
  };
  if (options.mode === 'benchmark_without_jev') return { status: 'benchmark_without_jev' as const, decision,
    jev: { available: false, attemptedChecks: 0, checkedClaims: 0, reportedCostUsd: 0 },
    elapsedMs: performance.now() - started };
  const spendGate = options.spendGate!;
  const jevChecker = checker!;
  const results: Array<{ attempted: boolean; settled: boolean; result: ClaimCheckResult | null }> = [];
  for (const [index, claim] of claims.entries()) {
    const passage = passages[index]!;
    let reservationId: string | null = null;
    try {
      const cap = await deadline(spendGate.check(), jevTimeoutMs);
      if (!cap || !cap.keyId || cap.resetAt !== null || !validCost(cap.limitUsd) || cap.limitUsd > 0.1 ||
        !validCost(cap.remainingUsd) || cap.remainingUsd < spendGate.maxRequestCostUsd || cap.remainingUsd > cap.limitUsd) break;
      reservationId = await deadline(spendGate.reserve(cap.keyId, spendGate.maxRequestCostUsd), jevTimeoutMs);
      if (!reservationId) break;
    } catch { break; }
    const controller = new AbortController();
    let result: ClaimCheckResult | null = null;
    try { result = await deadline(Promise.resolve().then(() => jevChecker.check({ claim: claim.text,
      quote: claim.evidenceExcerpt, passage }, { signal: controller.signal })), jevTimeoutMs, () => controller.abort()); }
    catch { controller.abort(); }
    const entry = { attempted: true, settled: false, result };
    results.push(entry);
    if (!validCost(result?.reportedCostUsd) || result.reportedCostUsd > spendGate.maxRequestCostUsd) break;
    try { await deadline(spendGate.settle(reservationId, result.reportedCostUsd), jevTimeoutMs); entry.settled = true; }
    catch { break; }
  }
  while (results.length < claims.length) results.push({ attempted: false, settled: false, result: null });
  const isJevResult = (result: (typeof results)[number]['result']) => Boolean(result &&
    (result.provider === 'openrouter_jev' || result.provider === 'typesafe_jev') &&
    (result.model === 'typesafe/jev-1.13-20260917' || result.model === 'jev-1.13.0') &&
    ['contradicted', 'not_established', 'review'].includes(result.verdict) &&
    validCost(result.reportedCostUsd) && result.reportedCostUsd <= spendGate.maxRequestCostUsd &&
    (result.reason === undefined ||
      result.reason === 'low_confidence' && result.verdict === 'review' ||
      result.reason === 'unbenchmarked_positive' && result.verdict === 'review' && result.suggestion === 'supported'));
  const available = results.every(item => item.attempted && item.settled && isJevResult(item.result));
  const attemptedChecks = results.filter(item => item.attempted).length;
  const checkedClaims = results.filter(item => item.settled && isJevResult(item.result)).length;
  const knownReportedCostUsd = results.reduce((sum, item) => sum +
    (validCost(item.result?.reportedCostUsd) ? item.result.reportedCostUsd : 0), 0);
  const unknownChargeChecks = results.filter(item => item.attempted && !validCost(item.result?.reportedCostUsd)).length;
  const checks = claims.map((claim, index) => ({ claim: claim.text, sourceId: claim.evidenceIds[0],
    sourceVerdict: 'supported' as const, jevVerdict: results[index].settled && isJevResult(results[index].result) ? results[index].result!.verdict : 'unavailable' as const,
    reviewRequired: !results[index].settled || !isJevResult(results[index].result) || results[index].result!.verdict !== 'supported' }));
  const reviewRequired = checks.some(check => check.reviewRequired);
  const reviewedDecision = reviewRequired ? { ...decision,
    nextInvestigations: [...new Set([...decision.nextInvestigations,
      'Review Jev-disputed source claims against the checked original.'])] } : decision;
  return { status: available ? 'jev_assisted' as const : 'degraded' as const, decision: reviewedDecision,
    jev: { available, attemptedChecks, checkedClaims, checks, reviewRequired,
      knownReportedCostUsd, unknownChargeChecks,
      reportedCostUsd: unknownChargeChecks ? null : knownReportedCostUsd }, elapsedMs: performance.now() - started };
}

/** Benchmark only: same source, roles and bridge, stopping before the Jev request. */
export function measureReviewedInvestigationWithoutJev(
  input: Input, clusterId: string, roles: RoleRunners, options: { roleTimeoutMs?: number } = {},
) {
  return runJevAssistedInvestigationCore(input, clusterId, roles, null,
    { mode: 'benchmark_without_jev', roleTimeoutMs: options.roleTimeoutMs });
}

/** Binds the capped key preflight and Jev request to the same credential. */
export function runJevAssistedInvestigation(
  input: Input, clusterId: string, roles: RoleRunners,
  options: { benchmarkApiKey: string; generalApiKey: string; fetcher?: typeof fetch;
    roleTimeoutMs?: number; jevTimeoutMs?: number },
) {
  const gate = createOpenRouterChatSpendGate({ apiKey: options.benchmarkApiKey,
    forbiddenApiKeys: [options.generalApiKey], maxAccountLimitUsd: 0.1,
    maxRequestCostUsd: 0.00017, maxTotalAttempts: 3, fetcher: options.fetcher });
  const checker: JevChecker = { check: (claim, request) => checkClaimWithJev(claim, {
    openRouterApiKey: options.benchmarkApiKey, fetcher: options.fetcher, signal: request?.signal,
  }) };
  return runJevAssistedInvestigationCore(input, clusterId, roles, checker, {
    spendGate: gate, roleTimeoutMs: options.roleTimeoutMs, jevTimeoutMs: options.jevTimeoutMs,
  });
}
