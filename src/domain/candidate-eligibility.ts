import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { haversineDistanceMeters } from '../engine/spatial';
import { loadHdbBlockLeads } from './hdb-block-leads';
import { planOneMapProbes, reviewOneMapSearch } from '../providers/onemap-search';
import { planSecondStageOneMapProbes } from '../providers/onemap-second-stage';

const manifestPath = 'src/data/snapshots/2026-10-12/onemap-town-sample.json';
const manifestSha256 = 'ea4e5c8d78199756579244f709a9e5b85b657813ba0053f3e5c3bef96f8c09a0';
const secondStageManifestPath = 'src/data/snapshots/2026-10-12/onemap-second-stage.json';
const secondStageManifestSha256 = 'baae0214697c303c247c385ff26acde5d53e757ae55388536be2875c241cc2da';
const maxPairwiseMetres = 125;
type Point = { townCode: string; block: string; street: string; latitude: number; longitude: number;
  publishedDwellingUnits: number;
  sourceUrl: string; retrievedAt: string; geographicScope: string;
  hdbSourceUrl: string; hdbRetrievedDate: string; hdbGeographicScope: string;
  hdbEvidenceStatus: 'observed_snapshot'; coordinateKind: 'address_point';
  evidenceStatus: 'checked_replay' | 'checked_api_replay' };
type Entry = { townCode?: unknown; block?: unknown; street?: unknown; sourceUrl?: unknown;
  retrievedAt?: unknown; httpStatus?: unknown; rawPath?: unknown; sha256?: unknown;
  reviewStatus?: unknown; outcome?: unknown };
type LocatedBlock = { townCode: string; block: string; street: string; latitude: number; longitude: number };

function sha256(bytes: Buffer) { return createHash('sha256').update(bytes).digest('hex'); }

/** Three-block all-pairs witnesses; a nearby fourth block cannot erase an existing witness. */
export function eligibleTriples<T extends LocatedBlock>(points: readonly T[]) {
  const groups: Array<{ townCode: string; members: T[]; maxPairwiseMetres: number }> = [];
  const codes = [...new Set(points.map(point => point.townCode))].sort();
  for (const code of codes) {
    const local = points.filter(point => point.townCode === code).sort((a, b) =>
      a.block.localeCompare(b.block, 'en', { numeric: true }) || a.street.localeCompare(b.street));
    // shortcut: cap cubic triple enumeration; use a reviewed dense-area algorithm above 100 points per town.
    if (local.length > 100) throw new Error('Too many checked points for bounded triple selection');
    for (let i = 0; i < local.length; i++) for (let j = i + 1; j < local.length; j++) {
      const ab = haversineDistanceMeters(local[i], local[j]);
      if (ab > maxPairwiseMetres) continue;
      for (let k = j + 1; k < local.length; k++) {
        const ac = haversineDistanceMeters(local[i], local[k]);
        const bc = haversineDistanceMeters(local[j], local[k]);
        if (ac <= maxPairwiseMetres && bc <= maxPairwiseMetres)
          groups.push({ townCode: code, members: [local[i], local[j], local[k]],
            maxPairwiseMetres: Math.max(ab, ac, bc) });
      }
    }
  }
  return groups;
}

/** Eligibility is a straight-line evidence filter, not a market catchment or rank. */
export function loadCandidateEligibility() {
  const inventory = loadHdbBlockLeads();
  const plan = planOneMapProbes(inventory);
  const manifestBytes = readFileSync(resolve(manifestPath));
  if (sha256(manifestBytes) !== manifestSha256) throw new Error('OneMap sample manifest integrity failure');
  const manifest = JSON.parse(manifestBytes.toString('utf8')) as { schemaVersion?: unknown;
    requestCeiling?: unknown; runStatus?: unknown; requestsMade?: unknown; selected?: unknown;
    outcome?: unknown; entries?: Entry[] };
  if (manifest.schemaVersion !== 1 || manifest.requestCeiling !== 27 || manifest.runStatus !== 'complete' ||
    manifest.requestsMade !== 27 || manifest.selected !== null || manifest.outcome !== 'insufficient_evidence' ||
    !Array.isArray(manifest.entries) || manifest.entries.length !== 27)
    throw new Error('Incomplete OneMap sample manifest');
  const root = realpathSync(resolve('src/data/snapshots/2026-10-12/original'));
  const points: Point[] = inventory.leads.filter(lead => lead.coordinateStatus === 'checked_replay')
    .map(lead => ({ townCode: lead.townCode, block: lead.block, street: lead.street,
      publishedDwellingUnits: lead.publishedDwellingUnits,
      latitude: lead.coordinate!.latitude, longitude: lead.coordinate!.longitude,
      sourceUrl: lead.coordinate!.sourceUrl, retrievedAt: lead.coordinate!.retrievedAt,
      geographicScope: `${lead.block} ${lead.street}, Singapore`,
      hdbSourceUrl: inventory.sourceUrl, hdbRetrievedDate: inventory.retrievedDate,
      hdbGeographicScope: inventory.geographicScope, hdbEvidenceStatus: inventory.evidenceStatus,
      coordinateKind: 'address_point', evidenceStatus: 'checked_replay' }));
  for (const [index, entry] of manifest.entries.entries()) {
    const lead = plan.probes[index];
    const expectedPath = `src/data/snapshots/2026-10-12/original/onemap-sample-${lead.townCode.toLowerCase()}.json`;
    if (entry.townCode !== lead.townCode || entry.block !== lead.block || entry.street !== lead.street ||
      entry.rawPath !== expectedPath || entry.httpStatus !== 200 || entry.reviewStatus !== 'address_point' ||
      entry.outcome !== 'insufficient_evidence' || typeof entry.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) || typeof entry.retrievedAt !== 'string' ||
      !/^2026-10-12T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(entry.retrievedAt) ||
      Number.isNaN(Date.parse(entry.retrievedAt)) || new Date(entry.retrievedAt).toISOString() !== entry.retrievedAt)
      throw new Error('Invalid OneMap sample entry');
    const file = realpathSync(resolve(expectedPath));
    if (!file.startsWith(root + sep)) throw new Error('OneMap original outside snapshot directory');
    const bytes = readFileSync(file);
    if (bytes.length > 64_000 || sha256(bytes) !== entry.sha256) throw new Error('OneMap original integrity failure');
    const reviewed = reviewOneMapSearch(lead, JSON.parse(bytes.toString('utf8')), entry.retrievedAt.slice(0, 10));
    if (entry.sourceUrl !== reviewed.sourceUrl || reviewed.status !== 'address_point')
      throw new Error('OneMap address did not match checked HDB identity');
    points.push({ townCode: lead.townCode, block: lead.block, street: lead.street,
      publishedDwellingUnits: lead.publishedDwellingUnits,
      latitude: reviewed.coordinate.latitude, longitude: reviewed.coordinate.longitude,
      sourceUrl: reviewed.sourceUrl, retrievedAt: entry.retrievedAt, geographicScope: reviewed.geographicScope,
      hdbSourceUrl: inventory.sourceUrl, hdbRetrievedDate: inventory.retrievedDate,
      hdbGeographicScope: inventory.geographicScope, hdbEvidenceStatus: inventory.evidenceStatus,
      coordinateKind: 'address_point', evidenceStatus: 'checked_api_replay' });
  }
  const secondBytes = readFileSync(resolve(secondStageManifestPath));
  if (sha256(secondBytes) !== secondStageManifestSha256)
    throw new Error('Second-stage OneMap manifest integrity failure');
  const second = JSON.parse(secondBytes.toString('utf8')) as { schemaVersion?: unknown;
    requestCeiling?: unknown; runStatus?: unknown; requestsMade?: unknown; selectionRule?: unknown;
    proximityStatus?: unknown; geographicScope?: unknown; selected?: unknown; outcome?: unknown; entries?: Entry[] };
  const secondPlan = planSecondStageOneMapProbes(inventory);
  if (second.schemaVersion !== 1 || second.requestCeiling !== 54 || second.runStatus !== 'complete' ||
    second.requestsMade !== 54 || second.selectionRule !== secondPlan.selectionRule ||
    second.proximityStatus !== 'unverified' || second.geographicScope !==
      'Two additional exact HDB block-and-street probes in each of 27 Singapore HDB contract-town codes' ||
    second.selected !== null || second.outcome !== 'insufficient_evidence' ||
    !Array.isArray(second.entries) || second.entries.length !== 54)
    throw new Error('Incomplete second-stage OneMap manifest');
  for (const [index, entry] of second.entries.entries()) {
    const lead = secondPlan.probes[index];
    const expectedPath = `src/data/snapshots/2026-10-12/original/onemap-second-stage-${lead.townCode.toLowerCase()}-${index % 2 + 1}.json`;
    if (entry.townCode !== lead.townCode || entry.block !== lead.block || entry.street !== lead.street ||
      entry.rawPath !== expectedPath || entry.httpStatus !== 200 ||
      !['address_point', 'not_found'].includes(String(entry.reviewStatus)) ||
      entry.outcome !== 'insufficient_evidence' || typeof entry.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(entry.sha256) || typeof entry.retrievedAt !== 'string' ||
      !/^2026-10-12T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(entry.retrievedAt) ||
      Number.isNaN(Date.parse(entry.retrievedAt)) ||
      new Date(entry.retrievedAt).toISOString() !== entry.retrievedAt)
      throw new Error('Invalid second-stage OneMap entry');
    const file = realpathSync(resolve(expectedPath));
    if (!file.startsWith(root + sep)) throw new Error('Second-stage OneMap original outside snapshot directory');
    const bytes = readFileSync(file);
    if (bytes.length > 64_000 || sha256(bytes) !== entry.sha256)
      throw new Error('Second-stage OneMap original integrity failure');
    const reviewed = reviewOneMapSearch(lead, JSON.parse(bytes.toString('utf8')), entry.retrievedAt.slice(0, 10));
    if (entry.sourceUrl !== reviewed.sourceUrl || reviewed.status !== entry.reviewStatus)
      throw new Error('Second-stage OneMap address review mismatch');
    if (reviewed.status === 'address_point') points.push({ townCode: lead.townCode,
      block: lead.block, street: lead.street, publishedDwellingUnits: lead.publishedDwellingUnits,
      latitude: reviewed.coordinate.latitude,
      longitude: reviewed.coordinate.longitude, sourceUrl: reviewed.sourceUrl,
      retrievedAt: entry.retrievedAt, geographicScope: reviewed.geographicScope,
      hdbSourceUrl: inventory.sourceUrl, hdbRetrievedDate: inventory.retrievedDate,
      hdbGeographicScope: inventory.geographicScope, hdbEvidenceStatus: inventory.evidenceStatus,
      coordinateKind: 'address_point', evidenceStatus: 'checked_api_replay' });
  }
  const ids = new Set(points.map(point => `${point.townCode}\0${point.block}\0${point.street}`));
  if (ids.size !== points.length) throw new Error('Duplicate checked block identity');
  const groups = eligibleTriples(points).map(group => ({ ...group,
    evidenceKind: 'derived_value' as const, outcome: 'insufficient_evidence' as const }));
  const groupedIds = new Set(groups.flatMap(group => group.members.map(member =>
    `${member.townCode}\0${member.block}\0${member.street}`)));
  const ungroupedCheckedPointCount = points.filter(point => !groupedIds.has(
    `${point.townCode}\0${point.block}\0${point.street}`)).length;
  const unresolvedSampledLeadCount = second.entries.filter(entry => entry.reviewStatus === 'not_found').length;
  const uncheckedHdbLeadCount = inventory.leads.length - points.length;
  return { checkedAddressPointCount: points.length, checkedPoints: points, ungroupedCheckedPointCount,
    unsampledHdbLeadCount: uncheckedHdbLeadCount - unresolvedSampledLeadCount,
    unresolvedSampledLeadCount, uncheckedHdbLeadCount,
    towns: inventory.towns.map(town => ({ code: town.code, status: 'unassessed' as const,
      checkedAddressPointCount: points.filter(point => point.townCode === town.code).length,
      totalHdbLeads: town.residentialLeadCount })),
    groups, selected: null, outcome: 'insufficient_evidence' as const };
}
