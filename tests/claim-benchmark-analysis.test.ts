import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeSavedJevBenchmark } from '../src/providers/claim-benchmark-analysis';

const fixture = () => JSON.parse(readFileSync(resolve('tests/fixtures/claim-check.json'), 'utf8'));
const report = () => JSON.parse(readFileSync(resolve('outputs/JEV_BENCHMARK_2026-10-08.json'), 'utf8'));

describe('saved Jev pilot analysis', () => {
  it('measures the deterministic baseline and reports full and held-out three-class errors', () => {
    const analysis = analyzeSavedJevBenchmark(fixture(), report(), 1000);
    expect(analysis.baselineTiming).toMatchObject({ iterations: 1000, casesPerIteration: 30, totalEvaluations: 30000, method: expect.any(String) });
    expect(analysis.baselineTiming.elapsedMs).toBeGreaterThan(0);
    expect(analysis.baselineTiming.meanCaseMs).toBeGreaterThan(0);
    expect(analysis.jev.full.total).toBe(30);
    expect(analysis.jev.heldOut.total).toBe(10);
    expect(analysis.jev.full.confusion.supported.supported).toBe(9);
    expect(analysis.jev.full.falseSupported).toBe(0);
    expect(analysis.jev.heldOut.falseSupported).toBe(0);
    expect(analysis.finalReview.full.confusion.supported.review).toBe(9);
    expect(analysis.baseline.full.confusion.supported.review).toBe(9);
  });

  it('rejects incomplete, relabelled, reordered, wrong-model, and auto-accepted reports', () => {
    const mutate = (change: (data: ReturnType<typeof report>) => void) => {
      const data = report(); change(data);
      expect(() => analyzeSavedJevBenchmark(fixture(), data, 1)).toThrow();
    };
    mutate(data => { data.results.pop(); });
    mutate(data => { data.results[0].expected = 'contradicted'; });
    mutate(data => { [data.results[0], data.results[1]] = [data.results[1], data.results[0]]; });
    mutate(data => { data.results[0].servedModel = 'other'; });
    mutate(data => { data.results[0].finalVerdict = 'supported'; });
    mutate(data => { data.status = 'unevaluated'; });
    mutate(data => { data.autoAcceptanceEnabled = true; });
    mutate(data => { data.baseline.results[0].verdict = 'supported'; });
    mutate(data => { data.unsupportedAccepted = 99; });
    mutate(data => { data.measuredCostUsd = 0; });
    mutate(data => { data.latencyMs = -1; });
    mutate(data => { data.fixture = 'observed'; });
    mutate(data => { data.observedAt = 'tomorrow'; });
    mutate(data => { data.fixtureSha256 = '0'.repeat(64); });
    mutate(data => { data.results.find((row: { id: string }) => row.id === 't12').finalVerdict = 'contradicted'; });
    mutate(data => { data.results.find((row: { id: string }) => row.id === 't14').finalVerdict = 'contradicted'; });
    mutate(data => { data.results.find((row: { id: string }) => row.id === 't12').reason = 'unbenchmarked_positive'; });
    const changedTune = fixture();
    changedTune[0].claim = 'Block 10 contains 100 flats.'; // same deterministic precheck outcome
    expect(() => analyzeSavedJevBenchmark(changedTune, report(), 1)).toThrow();
  });
});

it.skipIf(process.env.WRITE_BASELINE_ANALYSIS !== '1')('saves one offline baseline timing and held-out error analysis', () => {
  const analysis = analyzeSavedJevBenchmark(fixture(), report(), 1000);
  expect(analysis.jev.heldOut.total).toBe(10);
  writeFileSync(resolve('outputs/JEV_FALLBACK_ANALYSIS_2026-10-08.json'), `${JSON.stringify({ observedAt: new Date().toISOString(), ...analysis }, null, 2)}\n`, { flag: 'wx' });
});
