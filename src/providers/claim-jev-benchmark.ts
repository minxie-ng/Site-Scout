import { performance } from 'node:perf_hooks';
import { parseClaimBenchmark, scoreDeterministicBaseline, type ClaimBenchmarkCase } from './claim-benchmark';
import { precheckClaim, type ClaimVerdict } from './claim-check';
import { checkClaimWithMicroLimitedJev } from './typesafe';

const SERVED_MODEL = 'typesafe/jev-1.13-20260917';

export async function runJevClaimBenchmark(
  cases: ClaimBenchmarkCase[],
  options: { benchmarkApiKey: string; fetcher?: typeof fetch; signal?: AbortSignal },
) {
  const validated = parseClaimBenchmark(cases);
  const baseline = scoreDeterministicBaseline(validated);
  const results: Array<{
    id: string; split: ClaimBenchmarkCase['split']; expected: ClaimBenchmarkCase['expected'];
    rawSuggestion: ClaimVerdict | null; finalVerdict: ClaimVerdict; servedModel: string | null;
    reportedCostUsd: number | null; latencyMs: number; reason?: string;
  }> = [];
  const started = performance.now();
  let modelCalls = 0;
  let cost = 0;
  let completedSafely = Boolean(options.benchmarkApiKey);
  const fetcher: typeof fetch = async (url, init) => {
    if (String(url).endsWith('/systemone')) modelCalls++;
    return (options.fetcher ?? fetch)(url, init);
  };
  if (options.benchmarkApiKey) {
    for (const item of validated) {
      if (options.signal?.aborted) break;
      const caseStarted = performance.now();
      const input = { claim: item.claim, quote: item.quote, passage: item.passage };
      const prior = precheckClaim(input);
      const checked = prior ?? await checkClaimWithMicroLimitedJev(input, {
        openRouterApiKey: options.benchmarkApiKey, fetcher, signal: options.signal,
      });
      const reportedCostUsd = prior ? 0 : checked.reportedCostUsd ?? null;
      const servedModel = prior ? null : checked.model ?? null;
      const rawSuggestion = checked.suggestion ?? checked.verdict;
      results.push({
        id: item.id, split: item.split, expected: item.expected, rawSuggestion,
        finalVerdict: checked.verdict, servedModel, reportedCostUsd,
        latencyMs: performance.now() - caseStarted, ...(checked.reason ? { reason: checked.reason } : {}),
      });
      if (!prior && (checked.provider !== 'openrouter_jev' || servedModel !== SERVED_MODEL || reportedCostUsd === null || checked.reason === 'request_aborted' || checked.reason === 'billing_unverified' || checked.reason === 'micro_limit_unavailable' || checked.reason === 'invalid_response' || checked.reason?.startsWith('http_') || checked.reason === 'request_failed')) {
        completedSafely = false;
        break;
      }
      cost += reportedCostUsd ?? 0;
    }
  }
  const evaluated = completedSafely && results.length === 30 && !options.signal?.aborted;
  return {
    status: evaluated ? 'evaluated' as const : 'unevaluated' as const,
    provider: 'openrouter_jev' as const,
    requestedModel: SERVED_MODEL,
    total: 30,
    heldOut: 10,
    modelCalls,
    measuredCostUsd: evaluated ? cost : null,
    latencyMs: performance.now() - started,
    unsupportedAccepted: evaluated ? results.filter(item => item.expected !== 'supported' && item.rawSuggestion === 'supported').length : null,
    heldOutUnsupportedAccepted: evaluated ? results.filter(item => item.split === 'held_out' && item.expected !== 'supported' && item.rawSuggestion === 'supported').length : null,
    supportedAccepted: evaluated ? results.filter(item => item.expected === 'supported' && item.rawSuggestion === 'supported').length : null,
    autoAcceptanceEnabled: false as const,
    baseline,
    results,
  };
}
