import { expect, it } from 'vitest';
import { loadCandidateEligibility } from '../src/domain/candidate-eligibility';
import { buildIslandwideInvestigationOrder, orderCheckedGroups } from '../src/domain/islandwide-priority';

it('orders only checked few-block investigation areas by sourced housing-stock proxy', () => {
  const result = buildIslandwideInvestigationOrder();
  expect(result.priorities.map(item => [item.townCode, item.members.map(member => member.block),
    item.publishedDwellingUnits])).toEqual([
    ['QT', ['1', '2', '3'], 658],
    ['AMK', ['208', '217', '218'], 582],
    ['MP', ['30', '31', '34'], 528],
  ]);
  expect(result.priorities.map(item => item.investigationPriority)).toEqual([1, 2, 3]);
  expect(result.priorities.every(item => item.evidenceKind === 'derived_value' &&
    item.basis === 'published_dwelling_units_in_checked_three_block_group' &&
    item.siteRank === null && item.outcome === 'insufficient_evidence' &&
    item.members.length === 3 && item.members.every(member => Number.isSafeInteger(member.publishedDwellingUnits) &&
      member.publishedDwellingUnits > 0 && member.hdbSourceUrl.startsWith('https://data.gov.sg/') &&
      member.hdbRetrievedDate === '2026-10-12' && member.hdbEvidenceStatus === 'observed_snapshot' &&
      member.sourceUrl.startsWith('https://www.onemap.gov.sg/') && member.retrievedAt))).toBe(true);
  expect(result.towns).toHaveLength(27);
  expect(result.towns.every(town => town.status === 'unassessed')).toBe(true);
  expect(result.towns.filter(town => town.eligibleGroupCount === 0).map(town => town.code)).toEqual(['KWN']);
  expect(result.coverage).toMatchObject({ checkedPointCount: 162, eligibleGroupCount: 86,
    townsWithEligibleGroups: 26, unprobedLeadCount: 10_647, unresolvedSampledLeadCount: 8 });
  expect(result.selectionScope).toBe('sampled_groups_research_triage');
  expect(result.screeningRule).toContain('one group per town');
  expect(result.screeningRule).toContain('withhold');
  expect(result.nationalWinnerEstablished).toBe(false);
  expect(result.selectedSite).toBeNull();
  expect(result.outcome).toBe('insufficient_evidence');
});

it('is independent of input order, excludes duplicate-town groups and never breaks a cutoff tie', () => {
  const groups = loadCandidateEligibility().groups;
  const ordered = orderCheckedGroups(groups);
  expect(orderCheckedGroups([...groups].reverse())).toEqual(ordered);
  expect(new Set(ordered.priorities.map(item => item.townCode)).size).toBe(ordered.priorities.length);
  const tied = groups.map(group => ({ ...group,
    members: group.members.map(member => ({ ...member,
      publishedDwellingUnits: group.townCode === 'CL' || group.townCode === 'TG' ? 100 : 1 })) }));
  const tieOrder = orderCheckedGroups(tied);
  expect(tieOrder.priorities.length).toBeLessThanOrEqual(3);
  expect(tieOrder.withheldCutoffTie).toBe(true);
  expect(tieOrder.withheldTownTies).toContain('PG');
});

it('rejects unsafe derived totals and invalid geometric witnesses', () => {
  const group = loadCandidateEligibility().groups[0];
  const huge = { ...group, members: group.members.map(member => ({ ...member,
    publishedDwellingUnits: Math.floor(Number.MAX_SAFE_INTEGER / 2) })) };
  expect(() => orderCheckedGroups([huge])).toThrow('Invalid checked investigation group');
  expect(() => orderCheckedGroups([{ ...group, maxPairwiseMetres: Number.NaN }]))
    .toThrow('Invalid checked investigation group');
  expect(() => orderCheckedGroups([{ ...group, maxPairwiseMetres: -1 }]))
    .toThrow('Invalid checked investigation group');
});
