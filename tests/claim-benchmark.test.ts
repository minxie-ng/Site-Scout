import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseClaimBenchmark, scoreDeterministicBaseline } from '../src/providers/claim-benchmark';

const raw = () => JSON.parse(readFileSync(resolve('tests/fixtures/claim-check.json'), 'utf8'));

describe('held-out claim safety benchmark', () => {
  it('contains 30 unique synthetic labelled cases with a locked 20/10 split', () => {
    const cases = parseClaimBenchmark(raw());
    expect(cases).toHaveLength(30);
    expect(new Set(cases.map(item => item.id)).size).toBe(30);
    expect(cases.filter(item => item.split === 'tune')).toHaveLength(20);
    expect(cases.filter(item => item.split === 'held_out')).toHaveLength(10);
    expect(cases.every(item => item.provenance === 'synthetic_fixture')).toBe(true);
    expect(new Set(cases.map(item => item.expected))).toEqual(new Set(['supported', 'contradicted', 'not_established']));
    expect(cases.filter(item => item.expected === 'supported').every(item => item.passage.includes(item.quote))).toBe(true);
    expect([...new Set(cases.map(item => item.category))]).toEqual(expect.arrayContaining(['wrong_entity', 'changed_status', 'wrong_count', 'wrong_date', 'unsupported_inference', 'missing_quote', 'prompt_injection', 'exact_support']));
  });

  it('rejects duplicate IDs and any move out of the held-out partition', () => {
    const duplicate = raw(); duplicate[1].id = duplicate[0].id;
    expect(() => parseClaimBenchmark(duplicate)).toThrow();
    const leaked = raw(); leaked[20].split = 'tune';
    expect(() => parseClaimBenchmark(leaked)).toThrow();
    const changedHoldout = raw(); changedHoldout[20].claim = 'A changed held-out claim';
    expect(() => parseClaimBenchmark(changedHoldout)).toThrow();
  });

  it('records the conservative deterministic baseline without accepting unsupported claims', () => {
    const result = scoreDeterministicBaseline(parseClaimBenchmark(raw()));
    expect(result).toMatchObject({ baseline: 'conservative_precheck', total: 30, heldOut: 10, unsupportedAccepted: 0, acceptedSupported: 0, modelCalls: 0, measuredCostUsd: 0, latencyMs: null });
    expect(result.results).toHaveLength(30);
    expect(() => scoreDeterministicBaseline(parseClaimBenchmark(raw()).slice(0, 20))).toThrow();
  });
});
