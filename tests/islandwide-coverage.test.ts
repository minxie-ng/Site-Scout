import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { buildHdbTownCoverage, loadHdbTownCoverage, screenHdbTownCoverage } from '../src/domain/islandwide-coverage';

const original = JSON.parse(readFileSync(resolve('src/data/snapshots/2026-10-12/original/hdb-town-codes.json'), 'utf8'));

it('enumerates every official HDB property town code without calling any town assessed', () => {
  const coverage = buildHdbTownCoverage(original);
  expect(coverage.geographicUnit).toBe('hdb_building_contract_town_code');
  expect(coverage.sourceRowCount).toBe(13_392);
  expect(coverage.areas).toHaveLength(27);
  expect(new Set(coverage.areas.map(area => area.code)).size).toBe(27);
  expect(coverage.areas.find(area => area.code === 'PG')).toMatchObject({ status: 'unassessed' });
  expect(coverage.areas.every(area => area.status === 'unassessed')).toBe(true);
});

it('keeps all uncovered towns visible and selects no nationwide winner', () => {
  const result = screenHdbTownCoverage(buildHdbTownCoverage(original));
  expect(result.selected).toBeNull();
  expect(result.status).toBe('insufficient_evidence');
  expect(result.unassessedCodes).toHaveLength(27);
  expect(result.unassessedCodes).toContain('PG');
});

it('fails closed on an incomplete, duplicate or altered official enumeration', () => {
  expect(() => buildHdbTownCoverage({ ...original, result: { ...original.result, records: original.result.records.slice(1) } })).toThrow();
  expect(() => buildHdbTownCoverage({ ...original, result: { ...original.result, records: [...original.result.records, original.result.records[0]] } })).toThrow();
  expect(() => buildHdbTownCoverage({ ...original, result: { ...original.result, records: original.result.records.map((row: any) =>
    row.bldg_contract_town === 'PG' ? { ...row, bldg_contract_town: 'UNKNOWN' } : row) } })).toThrow();
});

it('checks the stored original before treating the enumeration as a replay snapshot', () => {
  expect(loadHdbTownCoverage().areas).toHaveLength(27);
});
