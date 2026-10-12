import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hdbTownCodes } from './islandwide-coverage';
import { buildReviewedMapSnapshot } from './map-snapshot';
import type { BlockCluster } from './block-cluster';

const resourceId = 'd_17f5382f26140b1fdae0ba2ef6239d2f';
const sourceUrl = `https://data.gov.sg/api/action/datastore_search?resource_id=${resourceId}&fields=bldg_contract_town,blk_no,street,residential,total_dwelling_units&limit=15000`;
const originalPath = 'src/data/snapshots/2026-10-12/original/hdb-block-leads.json';
const originalSha256 = 'd082565b9651e2a4529634cd1a73e08576e60105b2dd3cf41be89fd664eadc91';
type Row = { bldg_contract_town?: unknown; blk_no?: unknown; street?: unknown;
  residential?: unknown; total_dwelling_units?: unknown };
type Response = { success?: unknown; result?: { resource_id?: unknown; total?: unknown;
  limit?: unknown; records?: Row[] } };
type Lead = { townCode: string; block: string; street: string; publishedDwellingUnits: number;
  coordinateStatus: 'not_in_hdb_source' | 'checked_replay'; outcome: 'insufficient_evidence';
  coordinate?: { latitude: number; longitude: number; sourceUrl: string; retrievedAt: string } };

/** Discovery leads have exact HDB identities, but no address points or site rankings. */
export function buildHdbBlockLeads(snapshot: Response) {
  const result = snapshot?.result;
  if (snapshot?.success !== true || result?.resource_id !== resourceId || result.total !== 13_392 ||
    result.limit !== 15_000 || !Array.isArray(result.records) || result.records.length !== result.total)
    throw new Error('Incomplete HDB property response');
  const townCounts = new Map<string, number>(hdbTownCodes.map(code => [code, 0]));
  const identities = new Set<string>();
  const leads: Lead[] = [];
  for (const row of result.records) {
    const code = row?.bldg_contract_town;
    const block = row?.blk_no;
    const street = row?.street;
    const units = row?.total_dwelling_units;
    if (typeof code !== 'string' || !townCounts.has(code) || typeof block !== 'string' ||
      !/^[0-9A-Z]+$/.test(block) || typeof street !== 'string' || !/^[A-Z0-9 .']+$/.test(street) ||
      (row.residential !== 'Y' && row.residential !== 'N') ||
      typeof units !== 'string' || !/^(0|[1-9][0-9]*)$/.test(units) ||
      !Number.isSafeInteger(Number(units)) || (row.residential === 'Y' && Number(units) <= 0))
      throw new Error('Invalid HDB property row');
    const identity = `${code}\0${street}\0${block}`;
    if (identities.has(identity)) throw new Error('Duplicate HDB block and street');
    identities.add(identity);
    if (row.residential === 'Y') {
      townCounts.set(code, townCounts.get(code)! + 1);
      leads.push({ townCode: code, block, street, publishedDwellingUnits: Number(units),
        coordinateStatus: 'not_in_hdb_source', outcome: 'insufficient_evidence' });
    }
  }
  if (leads.length !== 10_817 || [...townCounts.values()].some(count => count === 0))
    throw new Error('Incomplete residential HDB leads');
  leads.sort((a, b) => a.townCode.localeCompare(b.townCode) || a.street.localeCompare(b.street) ||
    a.block.localeCompare(b.block, 'en', { numeric: true }));
  return { sourceUrl, retrievedDate: '2026-10-12', geographicScope: 'HDB Property Information records, Singapore',
    evidenceStatus: 'observed_snapshot' as const, sourceRowCount: result.total, leads,
    towns: hdbTownCodes.map(code => ({ code, residentialLeadCount: townCounts.get(code)!, status: 'unassessed' as const })),
    selected: null };
}

export function loadHdbBlockLeads() {
  const original = readFileSync(resolve(originalPath));
  if (createHash('sha256').update(original).digest('hex') !== originalSha256)
    throw new Error('HDB block-lead snapshot integrity failure');
  const inventory = buildHdbBlockLeads(JSON.parse(original.toString('utf8')));
  const clusterPaths = ['block-cluster.json', 'punggol-sapphire-cluster.json', 'punggol-ripples-cluster.json'];
  const records = clusterPaths.map(name => JSON.parse(readFileSync(resolve('src/data/snapshots/2026-10-06', name), 'utf8')));
  const map = buildReviewedMapSnapshot(records);
  const clusters = records as BlockCluster[]; // buildReviewedMapSnapshot validated these same records.
  const byIdentity = new Map(inventory.leads.map(lead => [`${lead.townCode}\0${lead.street}\0${lead.block}`, lead]));
  for (const feature of map.features) {
    const member = clusters.find(cluster => cluster.id === feature.properties.clusterId)?.members
      .find(item => item.blockId === feature.properties.blockId);
    const lead = member && byIdentity.get(`PG\0${member.hdbResidentialEvidence.street}\0${member.blockId}`);
    if (!member || !lead || lead.publishedDwellingUnits !== member.hdbResidentialEvidence.totalDwellingUnits ||
      lead.coordinateStatus !== 'not_in_hdb_source') throw new Error('Checked coordinate has no exact HDB lead');
    lead.coordinateStatus = 'checked_replay';
    lead.coordinate = { latitude: member.latitude, longitude: member.longitude,
      sourceUrl: feature.properties.oneMapSource.url, retrievedAt: feature.properties.oneMapSource.retrievedAt };
  }
  if (inventory.leads.filter(lead => lead.coordinateStatus === 'checked_replay').length !== 9)
    throw new Error('Incomplete checked coordinate join');
  return { ...inventory, towns: inventory.towns.map(town => ({ ...town,
    checkedCoordinateCount: inventory.leads.filter(lead => lead.townCode === town.code && lead.coordinateStatus === 'checked_replay').length })) };
}
