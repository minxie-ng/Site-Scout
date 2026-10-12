import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { parseClaimBenchmark, scoreDeterministicBaseline, type ClaimBenchmarkCase } from './claim-benchmark';
import type { ClaimCheckInput, ClaimVerdict } from './claim-check';

const verdictSchema = z.strictObject({ verdict: z.enum(['supported', 'contradicted', 'not_established', 'review']) });

type OfflineChecker = {
  provider: 'offline_fixture';
  model: string;
  timeoutMs?: number;
  check: (input: ClaimCheckInput) => Promise<{ verdict: ClaimVerdict }>;
};

export async function runOfflineClaimComparison(cases: ClaimBenchmarkCase[], checker: OfflineChecker) {
  const validatedCases = parseClaimBenchmark(cases);
  if (checker.provider !== 'offline_fixture' || !checker.model.trim()) throw new Error('Offline checker identity is required');
  const timeoutMs = checker.timeoutMs ?? 1000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 8000) throw new Error('Invalid per-case timeout');
  const baseline = scoreDeterministicBaseline(validatedCases);
  const results: Array<{ id: string; split: ClaimBenchmarkCase['split']; expected: ClaimBenchmarkCase['expected']; verdict: ClaimVerdict; latencyMs: number; error?: 'checker_failed' }> = [];
  const started = performance.now();
  for (const item of validatedCases) {
    const caseStarted = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const checked = verdictSchema.parse(await Promise.race([
        checker.check({ claim: item.claim, quote: item.quote, passage: item.passage }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('checker_timeout')), timeoutMs); }),
      ]));
      results.push({ id: item.id, split: item.split, expected: item.expected, verdict: checked.verdict, latencyMs: performance.now() - caseStarted });
    } catch {
      results.push({ id: item.id, split: item.split, expected: item.expected, verdict: 'review', latencyMs: performance.now() - caseStarted, error: 'checker_failed' });
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return {
    provider: checker.provider,
    model: checker.model,
    total: results.length,
    heldOut: results.filter(item => item.split === 'held_out').length,
    unsupportedAccepted: results.filter(item => item.expected !== 'supported' && item.verdict === 'supported').length,
    heldOutUnsupportedAccepted: results.filter(item => item.split === 'held_out' && item.expected !== 'supported' && item.verdict === 'supported').length,
    supportedAccepted: results.filter(item => item.expected === 'supported' && item.verdict === 'supported').length,
    latencyMs: performance.now() - started,
    modelCalls: 0 as const,
    measuredCostUsd: 0 as const,
    autoAcceptanceEnabled: false as const,
    baseline,
    results,
  };
}
