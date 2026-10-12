import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { claimBenchmarkSha256, parseClaimBenchmark, scoreDeterministicBaseline } from './claim-benchmark';
import { precheckClaim } from './claim-check';

const label = z.enum(['supported', 'contradicted', 'not_established']);
const verdict = z.enum(['supported', 'contradicted', 'not_established', 'review']);
const resultSchema = z.strictObject({
  id: z.string(), split: z.enum(['tune', 'held_out']), expected: label,
  rawSuggestion: verdict, finalVerdict: verdict,
  servedModel: z.string().nullable(), reportedCostUsd: z.number().finite().nonnegative().nullable(),
  latencyMs: z.number().finite().nonnegative(), reason: z.string().optional(),
});
const baselineRow = z.strictObject({ id: z.string(), split: z.enum(['tune', 'held_out']), expected: label, verdict });
const reportSchema = z.object({
  observedAt: z.string().datetime({ offset: true }), fixture: z.literal('synthetic_fixture'),
  fixtureSha256: z.string().regex(/^[a-f0-9]{64}$/), latencyMs: z.number().finite().nonnegative(),
  status: z.literal('evaluated'), provider: z.literal('openrouter_jev'),
  requestedModel: z.literal('typesafe/jev-1.13-20260917'),
  total: z.literal(30), heldOut: z.literal(10), modelCalls: z.number().int().nonnegative(),
  measuredCostUsd: z.number().finite().nonnegative(),
  unsupportedAccepted: z.number().int().nonnegative(),
  heldOutUnsupportedAccepted: z.number().int().nonnegative(),
  supportedAccepted: z.number().int().nonnegative(),
  autoAcceptanceEnabled: z.literal(false), results: z.array(resultSchema).length(30),
  baseline: z.object({ baseline: z.literal('conservative_precheck'), total: z.literal(30),
    heldOut: z.literal(10), modelCalls: z.literal(0), measuredCostUsd: z.literal(0),
    results: z.array(baselineRow).length(30) }),
});

type Row = { expected: z.infer<typeof label>; prediction: z.infer<typeof verdict> };
function tabulate(rows: Row[]) {
  const labels = label.options;
  const predictions = verdict.options;
  const confusion = Object.fromEntries(labels.map(expected => [expected,
    Object.fromEntries(predictions.map(prediction => [prediction,
      rows.filter(row => row.expected === expected && row.prediction === prediction).length]))])) as Record<Row['expected'], Record<Row['prediction'], number>>;
  return {
    total: rows.length, confusion,
    falseSupported: rows.filter(row => row.expected !== 'supported' && row.prediction === 'supported').length,
    supportedSuggested: rows.filter(row => row.expected === 'supported' && row.prediction === 'supported').length,
    threeClassErrors: rows.filter(row => row.prediction !== row.expected).length,
  };
}

export function analyzeSavedJevBenchmark(casesInput: unknown, reportInput: unknown, iterations = 1000) {
  if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 100_000) throw new Error('Invalid timing iterations');
  const cases = parseClaimBenchmark(casesInput);
  const report = reportSchema.parse(reportInput);
  if (report.fixtureSha256 !== claimBenchmarkSha256(cases)) throw new Error('Benchmark fixture content changed');
  const expectedBaseline = scoreDeterministicBaseline(cases);
  let reachedModel = 0;
  report.results.forEach((row, index) => {
    const item = cases[index];
    const baseline = report.baseline.results[index];
    if (row.id !== item.id || row.split !== item.split || row.expected !== item.expected ||
      baseline.id !== item.id || baseline.split !== item.split || baseline.expected !== item.expected ||
      baseline.verdict !== expectedBaseline.results[index].verdict) throw new Error(`Benchmark alignment failed at ${item.id}`);
    const prior = precheckClaim(item);
    if (prior) {
      if (row.servedModel !== null || row.reportedCostUsd !== 0 || row.rawSuggestion !== prior.verdict || row.finalVerdict !== prior.verdict) throw new Error(`Precheck result changed at ${item.id}`);
    } else {
      reachedModel++;
      if (row.servedModel !== report.requestedModel || row.reportedCostUsd === null) throw new Error(`Model result incomplete at ${item.id}`);
      if (row.rawSuggestion === 'review') throw new Error(`Missing model choice at ${item.id}`);
      const transitionValid = row.reason === 'low_confidence'
        ? row.finalVerdict === 'review'
        : row.rawSuggestion === 'supported'
          ? row.reason === 'unbenchmarked_positive' && row.finalVerdict === 'review'
          : row.reason === undefined && row.finalVerdict === row.rawSuggestion;
      if (!transitionValid) throw new Error(`Invalid model verdict transition at ${item.id}`);
    }
    if (row.finalVerdict === 'supported') throw new Error(`Positive automatically accepted at ${item.id}`);
  });
  if (report.modelCalls !== reachedModel) throw new Error('Model call count mismatch');
  const raw = report.results;
  const sum = raw.reduce((value, row) => value + (row.reportedCostUsd ?? 0), 0);
  const unsupported = raw.filter(row => row.expected !== 'supported' && row.rawSuggestion === 'supported').length;
  const heldUnsupported = raw.filter(row => row.split === 'held_out' && row.expected !== 'supported' && row.rawSuggestion === 'supported').length;
  const supported = raw.filter(row => row.expected === 'supported' && row.rawSuggestion === 'supported').length;
  if (Math.abs(report.measuredCostUsd - sum) > 1e-10 || report.unsupportedAccepted !== unsupported ||
    report.heldOutUnsupportedAccepted !== heldUnsupported || report.supportedAccepted !== supported) throw new Error('Report aggregates mismatch');
  const start = performance.now();
  for (let i = 0; i < iterations; i++) for (const item of cases) precheckClaim(item);
  const elapsedMs = performance.now() - start;
  const summarize = (predictions: Array<z.infer<typeof verdict>>) => {
    const rows = cases.map((item, index) => ({ expected: item.expected, prediction: predictions[index] }));
    return { full: tabulate(rows), heldOut: tabulate(rows.slice(20)) };
  };
  return {
    provenance: 'synthetic_fixture' as const,
    baselineTiming: { method: 'sequential in-process precheckClaim over locked fixture; performance.now wall time; excludes I/O and model calls', iterations,
      casesPerIteration: cases.length, totalEvaluations: cases.length * iterations,
      elapsedMs, meanCaseMs: elapsedMs / (cases.length * iterations) },
    jev: summarize(report.results.map(row => row.rawSuggestion)),
    finalReview: summarize(report.results.map(row => row.finalVerdict)),
    baseline: summarize(expectedBaseline.results.map(row => row.verdict)),
  };
}
