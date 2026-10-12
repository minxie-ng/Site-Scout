import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { loadHdbBlockLeads } from '../src/domain/hdb-block-leads';
import { planOneMapProbes, reviewOneMapSearch } from '../src/providers/onemap-search';

it('replays one dated authenticated OneMap pilot against the exact checked HDB lead', () => {
  const lead = planOneMapProbes(loadHdbBlockLeads()).probes[0];
  expect({ townCode: lead.townCode, block: lead.block, street: lead.street })
    .toEqual({ townCode: 'AMK', block: '205', street: 'ANG MO KIO AVE 1' });
  const bytes = readFileSync('src/data/snapshots/2026-10-12/original/onemap-pilot-amk.json');
  expect(createHash('sha256').update(bytes).digest('hex'))
    .toBe('dd798e05360f145d7b5a15dda3a44058e11f3335f60c9efde3c3f66562e1952f');
  const original = JSON.parse(bytes.toString('utf8'));
  expect(original.results[0]).toMatchObject({ BLK_NO: '205', ROAD_NAME: 'ANG MO KIO AVENUE 1',
    POSTAL: '560205', BUILDING: 'NIL' });
  const reviewed = reviewOneMapSearch(lead, original, '2026-10-12');
  expect(reviewed).toMatchObject({ status: 'address_point', outcome: 'insufficient_evidence',
    geographicScope: '205 ANG MO KIO AVE 1, Singapore',
    coordinate: { latitude: 1.366940843635359, longitude: 103.8435824350158 } });
});
