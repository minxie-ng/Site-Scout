import { z } from 'zod';
import { parseDevelopmentRecord } from '../domain/evidence';
import { decideReviewedCluster } from '../engine/decision';
import { compareReviewedResearchWorkflowsAsync, type AsyncComparisonReport } from './async-research-comparison';
import { createOpenRouterAsyncResearchCaller } from './openrouter-async-research';
import { createOpenRouterChatSpendGate } from './openrouter-chat-spend-gate';

const MODEL = 'mistralai/mistral-nemo';
const CATALOG_URL = 'https://openrouter.ai/api/v1/models';
const MAX_PROMPT_BYTES = 3072;
const MAX_OUTPUT_TOKENS = 1200;
const MAX_REQUEST_COST_USD = 0.00017;
const MAX_ATTEMPTS = 28;
const LIVE_CALL_TIMEOUT_MS = 30_000;
const CASES = [
  { id: 'checked_context', toolStatus: 'ok' }, { id: 'failed_tool', toolStatus: 'failed' },
  { id: 'stale_tool', toolStatus: 'stale' }, { id: 'missing_fields', toolStatus: 'ok' },
  { id: 'conflict', toolStatus: 'ok' }, { id: 'unsupported', toolStatus: 'ok' },
  { id: 'retrieved_instructions', toolStatus: 'ok' },
] as const;
const catalogSchema = z.object({ data: z.array(z.object({ id: z.string(), pricing: z.object({
  prompt: z.string(), completion: z.string(), request: z.string().optional(),
}) })) });

export type LiveResearchResult =
  | { status: 'preflight_failed'; reason: string; model: typeof MODEL; comparison?: never; tariff?: never }
  | { status: 'ran'; mode: 'canary' | 'comparison' | 'comparison_focused' | 'diagnostic_market' | 'diagnostic_area'; model: typeof MODEL; tariff: { sourceUrl: typeof CATALOG_URL; retrievedAt: string;
      inputUsdPerToken: number; outputUsdPerToken: number; requestUsd: number };
    keyCap: { limitUsd: number; remainingUsdBeforeRun: number; resetAt: null };
    comparison: AsyncComparisonReport };

export async function runLiveResearchComparison(
  input: Parameters<typeof decideReviewedCluster>[0], clusterId: string,
  options: { benchmarkApiKey: string; generalApiKey: string; fetcher?: typeof fetch;
    signal?: AbortSignal; mode?: 'canary' | 'comparison' | 'comparison_focused' | 'diagnostic_market' | 'diagnostic_area' },
): Promise<LiveResearchResult> {
  const fail = (reason: string): LiveResearchResult => ({ status: 'preflight_failed', reason, model: MODEL });
  if (!options || ![undefined, 'canary', 'comparison', 'comparison_focused', 'diagnostic_market', 'diagnostic_area'].includes(options.mode) ||
    !options.benchmarkApiKey?.trim() || !options.generalApiKey?.trim() ||
    options.benchmarkApiKey === options.generalApiKey) return fail('invalid_or_shared_key');
  const mode = options.mode ?? 'comparison';
  const attemptLimit = mode === 'comparison' ? MAX_ATTEMPTS : mode === 'comparison_focused' ? 16 : 1;
  let snapshot: typeof input;
  try {
    snapshot = structuredClone(input);
    if (!parseDevelopmentRecord(snapshot.development).success) return fail('invalid_checked_replay');
    decideReviewedCluster(snapshot, clusterId);
  } catch { return fail('invalid_checked_replay'); }
  if (options.signal?.aborted) return fail('request_aborted');

  let tariff: Extract<LiveResearchResult, { status: 'ran' }>['tariff'];
  const catalogAbort = new AbortController();
  const forwardAbort = () => catalogAbort.abort();
  options.signal?.addEventListener('abort', forwardAbort, { once: true });
  const catalogTimer = setTimeout(() => catalogAbort.abort(), 8000);
  try {
    const aborted = new Promise<never>((_, reject) => {
      catalogAbort.signal.addEventListener('abort', () => reject(new Error('Catalog request aborted')), { once: true });
    });
    const catalogRequest = (async () => {
      const response = await (options.fetcher ?? fetch)(CATALOG_URL, { signal: catalogAbort.signal });
      if (!response.ok) throw new Error('Catalog unavailable');
      return catalogSchema.parse(await response.json());
    })();
    const parsed = await Promise.race([catalogRequest, aborted]);
    const price = parsed.data.find(item => item.id === MODEL)?.pricing;
    if (!price) return fail('tariff_unavailable');
    const validPrice = (value: string | undefined) => value !== undefined &&
      /^(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value);
    if (!validPrice(price.prompt) || !validPrice(price.completion) ||
      !validPrice(price.request ?? '0')) return fail('tariff_unavailable');
    const inputPrice = Number(price.prompt);
    const outputPrice = Number(price.completion);
    const requestPrice = Number(price.request ?? '0');
    if (![inputPrice, outputPrice, requestPrice].every(value => Number.isFinite(value) && value >= 0) ||
      !price.prompt.trim() || !price.completion.trim()) return fail('tariff_unavailable');
    // Budget includes a 1,024-token chat-protocol margin beyond the 3,072-byte prompt ceiling.
    const worstCase = (MAX_PROMPT_BYTES + 1024) * inputPrice + MAX_OUTPUT_TOKENS * outputPrice + requestPrice;
    if (worstCase > MAX_REQUEST_COST_USD) return fail('tariff_exceeds_reserve');
    tariff = { sourceUrl: CATALOG_URL, retrievedAt: new Date().toISOString(),
      inputUsdPerToken: inputPrice, outputUsdPerToken: outputPrice, requestUsd: requestPrice };
  } catch { return fail('tariff_unavailable'); }
  finally {
    clearTimeout(catalogTimer);
    options.signal?.removeEventListener('abort', forwardAbort);
  }
  if (options.signal?.aborted) return fail('request_aborted');

  let gate: ReturnType<typeof createOpenRouterChatSpendGate>;
  let cap: Awaited<ReturnType<typeof gate.check>>;
  try {
    gate = createOpenRouterChatSpendGate({ apiKey: options.benchmarkApiKey,
      forbiddenApiKeys: [options.generalApiKey], maxAccountLimitUsd: 0.1,
      maxRequestCostUsd: MAX_REQUEST_COST_USD, maxTotalAttempts: attemptLimit, fetcher: options.fetcher });
    cap = await gate.check();
  } catch { return fail('cap_unavailable'); }
  if (cap.remainingUsd < MAX_REQUEST_COST_USD * attemptLimit) return fail('insufficient_cap');
  if (options.signal?.aborted) return fail('request_aborted');

  const caller = createOpenRouterAsyncResearchCaller({ apiKey: options.benchmarkApiKey,
    maxPromptBytes: MAX_PROMPT_BYTES, maxRequestCostUsd: MAX_REQUEST_COST_USD, fetcher: options.fetcher });
  const comparison = await compareReviewedResearchWorkflowsAsync(snapshot, clusterId,
    mode === 'comparison_focused' ? CASES.slice(0, 4) : CASES,
    { caller, spendGate: gate, model: MODEL, signal: options.signal, timeoutMs: LIVE_CALL_TIMEOUT_MS,
      comparisonProtocol: mode === 'comparison_focused' ? 'focused_four_case' : undefined,
      diagnosticRole: mode === 'diagnostic_market' ? 'market' : mode === 'diagnostic_area' ? 'area' : undefined });
  return { status: 'ran', mode, model: MODEL, tariff,
    keyCap: { limitUsd: cap.limitUsd, remainingUsdBeforeRun: cap.remainingUsd, resetAt: null }, comparison };
}
