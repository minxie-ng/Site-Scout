import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { buildHdbBlockLeads, loadHdbBlockLeads } from '../src/domain/hdb-block-leads';

const original = JSON.parse(readFileSync(resolve('src/data/snapshots/2026-10-12/original/hdb-block-leads.json'), 'utf8'));

it('retains exact residential block and street leads in all 27 HDB town codes', () => {
  const result = buildHdbBlockLeads(original);
  expect(result.sourceRowCount).toBe(13_392);
  expect(result.leads).toHaveLength(10_817);
  expect(new Set(result.leads.map(lead => lead.townCode)).size).toBe(27);
  expect(result.leads).toContainEqual({ townCode: 'PG', block: '442A', street: 'NEW PUNGGOL RD',
    publishedDwellingUnits: 194, coordinateStatus: 'not_in_hdb_source', outcome: 'insufficient_evidence' });
  expect(result.leads.every(lead => lead.coordinateStatus === 'not_in_hdb_source' &&
    lead.outcome === 'insufficient_evidence' && !('rank' in lead))).toBe(true);
  expect(result.towns).toHaveLength(27);
  expect(result.towns.every(town => town.status === 'unassessed' && town.residentialLeadCount > 0)).toBe(true);
  expect(result.selected).toBeNull();
});

it('rejects incomplete rows, duplicate block-street identities and altered town codes', () => {
  const rows = original.result.records;
  expect(() => buildHdbBlockLeads({ ...original, result: { ...original.result, records: rows.slice(1) } })).toThrow();
  expect(() => buildHdbBlockLeads({ ...original, result: { ...original.result,
    records: rows.map((row: any, index: number) => index === 1 ? { ...row,
      blk_no: rows[0].blk_no, street: rows[0].street, bldg_contract_town: rows[0].bldg_contract_town } : row) } })).toThrow();
  expect(() => buildHdbBlockLeads({ ...original, result: { ...original.result,
    records: rows.map((row: any, index: number) => index === 0 ? { ...row, bldg_contract_town: 'FAKE' } : row) } })).toThrow();
});

it('replays only the pinned official original', () => {
  const replay = loadHdbBlockLeads();
  expect(replay.leads).toHaveLength(10_817);
  expect(replay.towns.find(town => town.code === 'PG')).toMatchObject({ status: 'unassessed', checkedCoordinateCount: 9 });
  expect(replay.towns.filter(town => town.checkedCoordinateCount > 0).map(town => town.code)).toEqual(['PG']);
  expect(replay.leads.find(lead => lead.townCode === 'PG' && lead.block === '442A' && lead.street === 'NEW PUNGGOL RD'))
    .toMatchObject({ coordinateStatus: 'checked_replay', coordinate: { latitude: expect.any(Number), longitude: expect.any(Number) } });
  expect(replay.selected).toBeNull();
});
