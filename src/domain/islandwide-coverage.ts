import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const resourceId = 'd_17f5382f26140b1fdae0ba2ef6239d2f';
const sourceUrl = `https://data.gov.sg/api/action/datastore_search?resource_id=${resourceId}&fields=bldg_contract_town&limit=15000`;
const originalPath = 'src/data/snapshots/2026-10-12/original/hdb-town-codes.json';
const originalSha256 = '8ae2ad75104bb18b212d81e27113eeb40169fbf8cd13a038587d062a967b4617';
export const hdbTownCodes = Object.freeze(['AMK', 'BB', 'BD', 'BH', 'BM', 'BP', 'BT', 'CCK', 'CL', 'CT', 'GL', 'HG',
  'JE', 'JW', 'KWN', 'MP', 'PG', 'PRC', 'QT', 'SB', 'SGN', 'SK', 'TAP', 'TG', 'TP', 'WL', 'YS']);

type SourceResponse = { success?: unknown; result?: { resource_id?: unknown; total?: unknown;
  limit?: unknown; records?: Array<{ bldg_contract_town?: unknown }> } };

/** HDB contract-town codes are an islandwide discovery grid, not assessed markets. */
export function buildHdbTownCoverage(snapshot: SourceResponse) {
  const result = snapshot?.result;
  if (snapshot?.success !== true || result?.resource_id !== resourceId || result.total !== 13_392 ||
    result.limit !== 15_000 || !Array.isArray(result.records) || result.records.length !== result.total)
    throw new Error('Incomplete HDB town enumeration');
  const observed = new Set(result.records.map(row => row?.bldg_contract_town));
  if (observed.size !== hdbTownCodes.length || hdbTownCodes.some(code => !observed.has(code)))
    throw new Error('Unexpected HDB town codes');
  return { geographicUnit: 'hdb_building_contract_town_code' as const, geographicScope: 'HDB Property Information records, Singapore',
    sourceUrl, retrievedDate: '2026-10-12', evidenceStatus: 'observed_snapshot' as const,
    sourceRowCount: result.total, areas: hdbTownCodes.map(code => ({ code, status: 'unassessed' as const })) };
}

export function loadHdbTownCoverage() {
  const original = readFileSync(resolve(originalPath));
  if (createHash('sha256').update(original).digest('hex') !== originalSha256)
    throw new Error('HDB town snapshot integrity failure');
  return buildHdbTownCoverage(JSON.parse(original.toString('utf8')));
}

export function screenHdbTownCoverage(coverage: ReturnType<typeof buildHdbTownCoverage>) {
  if (coverage.areas.length !== hdbTownCodes.length || coverage.areas.some((area, index) =>
    area.code !== hdbTownCodes[index] || area.status !== 'unassessed')) throw new Error('Incomplete coverage');
  return { status: 'insufficient_evidence' as const, selected: null,
    unassessedCodes: coverage.areas.map(area => area.code) };
}
