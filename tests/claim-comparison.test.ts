import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseClaimBenchmark } from '../src/providers/claim-benchmark';
import { runOfflineClaimComparison } from '../src/providers/claim-comparison';

const cases = () => parseClaimBenchmark(JSON.parse(readFileSync(resolve('tests/fixtures/claim-check.json'), 'utf8')));

describe('offline claim comparison', () => {
  it('runs every locked case, records exact mock identity and safety metrics without enabling acceptance', async () => {
    const result = await runOfflineClaimComparison(cases(), {
      provider: 'offline_fixture', model: 'scripted-v1',
      check: async ({ passage }) => ({ verdict: passage.includes('SYSTEM:') ? 'supported' : 'review' }),
    });
    expect(result).toMatchObject({ provider: 'offline_fixture', model: 'scripted-v1', total: 30, heldOut: 10, modelCalls: 0, measuredCostUsd: 0, autoAcceptanceEnabled: false });
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.results).toHaveLength(30);
    expect(result.heldOutUnsupportedAccepted).toBe(1);
    expect(result.supportedAccepted).toBe(0);
    expect(result.baseline).toMatchObject({ baseline: 'conservative_precheck', unsupportedAccepted: 0, acceptedSupported: 0 });
  });

  it('rejects incomplete benchmark input and identity, and fails closed on invalid checker output', async () => {
    const config = { provider: 'offline_fixture' as const, model: 'scripted-v1', check: async () => ({ verdict: 'review' as const }) };
    await expect(runOfflineClaimComparison(cases().slice(0, 20), config)).rejects.toThrow();
    await expect(runOfflineClaimComparison(cases(), { ...config, model: '' })).rejects.toThrow();
    const invalid = await runOfflineClaimComparison(cases(), { ...config, check: async () => ({ verdict: 'approve' as never }) });
    expect(invalid.results.every(item => item.verdict === 'review' && item.error === 'checker_failed')).toBe(true);
  });

  it('fails closed and records an error when an offline checker throws', async () => {
    const result = await runOfflineClaimComparison(cases(), { provider: 'offline_fixture', model: 'scripted-v1', check: async () => { throw new Error('bad'); } });
    expect(result.results.every(item => item.verdict === 'review' && item.error === 'checker_failed')).toBe(true);
    expect(result.autoAcceptanceEnabled).toBe(false);
  });

  it('scores the validated snapshot even when the checker mutates caller-owned cases', async () => {
    const input = cases();
    let calls = 0;
    const result = await runOfflineClaimComparison(input, {
      provider: 'offline_fixture', model: 'scripted-v1',
      check: async () => {
        if (calls++ === 0) { input[20].expected = 'supported'; input[20].split = 'tune'; input[20].claim = 'tampered'; }
        return { verdict: 'review' };
      },
    });
    expect(result.results[20]).toMatchObject({ id: 'h01', split: 'held_out', expected: 'supported', verdict: 'review' });
    expect(result.heldOut).toBe(10);
  });

  it('times out a stalled case and completes the report fail-closed', async () => {
    const result = await runOfflineClaimComparison(cases(), {
      provider: 'offline_fixture', model: 'scripted-v1', timeoutMs: 5,
      check: async () => new Promise(() => {}),
    });
    expect(result.results).toHaveLength(30);
    expect(result.results.every(item => item.verdict === 'review' && item.error === 'checker_failed')).toBe(true);
    expect(result.autoAcceptanceEnabled).toBe(false);
  });
});
