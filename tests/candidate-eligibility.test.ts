import { expect, it } from 'vitest';
import { eligibleTriples, loadCandidateEligibility } from '../src/domain/candidate-eligibility';

it('derives only multi-block investigation groups from integrity-checked address points', () => {
  const result = loadCandidateEligibility();
  expect(result.checkedAddressPointCount).toBe(162);
  expect(result.checkedPoints).toHaveLength(162);
  expect(result.ungroupedCheckedPointCount).toBe(34);
  expect(result.unsampledHdbLeadCount).toBe(10_647);
  expect(result.unresolvedSampledLeadCount).toBe(8);
  expect(result.uncheckedHdbLeadCount).toBe(10_655);
  expect(result.towns).toHaveLength(27);
  expect(result.towns.every(town => town.status === 'unassessed')).toBe(true);
  expect(result.groups).toHaveLength(86);
  expect(new Set(result.groups.map(group => group.townCode)).size).toBe(26);
  expect(result.groups.some(group => group.members.map(member => member.block).sort().join(',') ===
    '442A,442B,443A')).toBe(true);
  expect(result.groups.every(group => group.members.length >= 3 &&
    group.maxPairwiseMetres <= 125 && group.evidenceKind === 'derived_value' &&
    group.outcome === 'insufficient_evidence' && !('rank' in group))).toBe(true);
  expect(result.groups.flatMap(group => group.members).every(member =>
    member.geographicScope === `${member.block} ${member.street}, Singapore` &&
    member.hdbGeographicScope === 'HDB Property Information records, Singapore' &&
    member.hdbEvidenceStatus === 'observed_snapshot' &&
    ['checked_replay', 'checked_api_replay'].includes(member.evidenceStatus) &&
    member.sourceUrl.startsWith('https://www.onemap.gov.sg/') && member.retrievedAt &&
    member.hdbSourceUrl.startsWith('https://data.gov.sg/') && member.hdbRetrievedDate === '2026-10-12')).toBe(true);
  expect(result.checkedPoints.filter(point => point.evidenceStatus === 'checked_api_replay')).toHaveLength(153);
  expect(result.checkedPoints.some(point => point.townCode === 'KWN' && point.block === '102' &&
    point.street === 'TOWNER RD')).toBe(false);
  expect(result.checkedPoints.some(point => point.townCode === 'KWN' && point.block === '101' &&
    point.street === 'JLN RAJAH')).toBe(false);
  expect(result.checkedPoints.every(point => point.geographicScope === `${point.block} ${point.street}, Singapore` &&
    point.hdbGeographicScope === 'HDB Property Information records, Singapore' &&
    point.hdbEvidenceStatus === 'observed_snapshot' && Number.isSafeInteger(point.publishedDwellingUnits) &&
    point.publishedDwellingUnits > 0)).toBe(true);
  expect(result.selected).toBeNull();
  expect(result.outcome).toBe('insufficient_evidence');
});

it('does not turn one sampled point per town into eligible groups', () => {
  const result = loadCandidateEligibility();
  expect(result.towns.filter(town => town.checkedAddressPointCount >= 2)).toHaveLength(27);
  expect(result.towns.find(town => town.code === 'PG')).toMatchObject({ checkedAddressPointCount: 12,
    status: 'unassessed' });
  expect(result.groups.every(group => group.members.every(member => member.townCode === group.townCode))).toBe(true);
});

it('keeps a valid all-pairs triple when a fourth point bridges to only one member', () => {
  const points = [0, 0.0004, 0.0008, 0.0016].map((offset, index) => ({
    townCode: 'TEST', block: String(index + 1), street: 'SAME ROAD',
    latitude: 1.3 + offset, longitude: 103.8,
  }));
  expect(eligibleTriples(points).map(group => group.members.map(member => member.block)))
    .toEqual([['1', '2', '3']]);
});
