import { z } from 'zod';
import { createHash } from 'node:crypto';
import { precheckClaim, type ClaimVerdict } from './claim-check';

const caseSchema = z.strictObject({
  id: z.string().regex(/^(?:t|h)\d{2}$/),
  split: z.enum(['tune', 'held_out']),
  provenance: z.literal('synthetic_fixture'),
  category: z.enum(['wrong_entity', 'changed_status', 'wrong_count', 'wrong_date', 'unsupported_inference', 'missing_quote', 'prompt_injection', 'exact_support']),
  expected: z.enum(['supported', 'contradicted', 'not_established']),
  claim: z.string().trim().min(1).max(1000),
  quote: z.string().trim().min(1).max(2000),
  passage: z.string().trim().min(1).max(12000),
});

const HELD_OUT_SHA256 = 'c37893b6ff4816e4f11848db3673a8e880ed5e7042436e3839f4357847323fed';

export type ClaimBenchmarkCase = z.infer<typeof caseSchema>;

export function claimBenchmarkSha256(cases: ClaimBenchmarkCase[]): string {
  return createHash('sha256').update(JSON.stringify(parseClaimBenchmark(cases))).digest('hex');
}

export function parseClaimBenchmark(input: unknown): ClaimBenchmarkCase[] {
  const cases = z.array(caseSchema).length(30).parse(input);
  cases.forEach((item, index) => {
    const expectedId = index < 20 ? `t${String(index + 1).padStart(2, '0')}` : `h${String(index - 19).padStart(2, '0')}`;
    const expectedSplit = index < 20 ? 'tune' : 'held_out';
    if (item.id !== expectedId || item.split !== expectedSplit) {
      throw new Error(`Invalid benchmark partition at case ${index + 1}`);
    }
  });
  const heldOutHash = createHash('sha256').update(JSON.stringify(cases.slice(20))).digest('hex');
  if (heldOutHash !== HELD_OUT_SHA256) throw new Error('Held-out benchmark content changed');
  return cases;
}

export type BaselineResult = {
  baseline: 'conservative_precheck';
  total: number;
  heldOut: number;
  unsupportedAccepted: number;
  acceptedSupported: number;
  modelCalls: 0;
  measuredCostUsd: 0;
  latencyMs: null;
  results: Array<{ id: string; split: ClaimBenchmarkCase['split']; expected: ClaimBenchmarkCase['expected']; verdict: ClaimVerdict }>;
};

export function scoreDeterministicBaseline(cases: ClaimBenchmarkCase[]): BaselineResult {
  parseClaimBenchmark(cases);
  const results = cases.map(({ id, split, expected, claim, quote, passage }) => ({
    id, split, expected,
    verdict: precheckClaim({ claim, quote, passage })?.verdict ?? 'review',
  }));
  return {
    baseline: 'conservative_precheck',
    total: results.length,
    heldOut: results.filter((item) => item.split === 'held_out').length,
    unsupportedAccepted: results.filter((item) => item.expected !== 'supported' && item.verdict === 'supported').length,
    acceptedSupported: results.filter((item) => item.expected === 'supported' && item.verdict === 'supported').length,
    modelCalls: 0,
    measuredCostUsd: 0,
    latencyMs: null,
    results,
  };
}
