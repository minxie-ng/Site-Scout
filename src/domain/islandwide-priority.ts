import { loadCandidateEligibility } from './candidate-eligibility';

type Eligibility = ReturnType<typeof loadCandidateEligibility>;
type Group = Eligibility['groups'][number];

/** Research triage over already checked groups; dwelling stock is not customer demand. */
export function orderCheckedGroups(groups: readonly Group[]) {
  const candidates = groups.map(group => {
    if (group.members.length !== 3 || group.evidenceKind !== 'derived_value' ||
      group.outcome !== 'insufficient_evidence' || !Number.isFinite(group.maxPairwiseMetres) ||
      group.maxPairwiseMetres < 0 || group.maxPairwiseMetres > 125 ||
      group.members.some(member => member.townCode !== group.townCode ||
        !Number.isSafeInteger(member.publishedDwellingUnits) || member.publishedDwellingUnits <= 0))
      throw new Error('Invalid checked investigation group');
    const publishedDwellingUnits = group.members.reduce((sum, member) => sum + member.publishedDwellingUnits, 0);
    if (!Number.isSafeInteger(publishedDwellingUnits)) throw new Error('Invalid checked investigation group');
    return { id: `${group.townCode}:${group.members.map(member => `${member.block} ${member.street}`).join('|')}`,
      townCode: group.townCode, members: group.members, publishedDwellingUnits,
      maxPairwiseMetres: group.maxPairwiseMetres };
  });
  const byTown = new Map<string, typeof candidates>();
  for (const candidate of candidates) byTown.set(candidate.townCode,
    [...(byTown.get(candidate.townCode) ?? []), candidate]);
  const townLeads: typeof candidates = [];
  const withheldTownTies: string[] = [];
  for (const [code, local] of byTown) {
    local.sort((a, b) => b.publishedDwellingUnits - a.publishedDwellingUnits || a.id.localeCompare(b.id, 'en'));
    if (local.length > 1 && local[0].publishedDwellingUnits === local[1].publishedDwellingUnits)
      withheldTownTies.push(code);
    else townLeads.push(local[0]);
  }
  townLeads.sort((a, b) => b.publishedDwellingUnits - a.publishedDwellingUnits || a.id.localeCompare(b.id, 'en'));
  const priorities: Array<(typeof candidates)[number] & { investigationPriority: number;
    basis: 'published_dwelling_units_in_checked_three_block_group'; evidenceKind: 'derived_value';
    siteRank: null; outcome: 'insufficient_evidence' }> = [];
  let withheldCutoffTie = false;
  for (let index = 0; index < townLeads.length && priorities.length < 3;) {
    const total = townLeads[index].publishedDwellingUnits;
    const tier = townLeads.slice(index).filter(item => item.publishedDwellingUnits === total);
    if (priorities.length + tier.length > 3) { withheldCutoffTie = true; break; }
    const investigationPriority = priorities.length + 1;
    priorities.push(...tier.map(item => ({ ...item, investigationPriority,
      basis: 'published_dwelling_units_in_checked_three_block_group' as const,
      evidenceKind: 'derived_value' as const, siteRank: null, outcome: 'insufficient_evidence' as const })));
    index += tier.length;
  }
  return { priorities, withheldTownTies: withheldTownTies.sort(), withheldCutoffTie };
}

export function buildIslandwideInvestigationOrder() {
  const eligibility = loadCandidateEligibility();
  const order = orderCheckedGroups(eligibility.groups);
  const towns = eligibility.towns.map(town => ({ ...town,
    eligibleGroupCount: eligibility.groups.filter(group => group.townCode === town.code).length }));
  return { ...order, towns,
    coverage: { checkedPointCount: eligibility.checkedAddressPointCount,
      eligibleGroupCount: eligibility.groups.length,
      townsWithEligibleGroups: towns.filter(town => town.eligibleGroupCount > 0).length,
      unprobedLeadCount: eligibility.unsampledHdbLeadCount,
      unresolvedSampledLeadCount: eligibility.unresolvedSampledLeadCount },
    selectionScope: 'sampled_groups_research_triage' as const,
    screeningRule: 'Order checked three-block groups by summed published HDB dwelling units; keep one group per town; withhold a town with tied top groups and withhold any tie tier crossing the three-slot cutoff.' as const,
    nationalWinnerEstablished: false as const, selectedSite: null,
    unresolvedFactors: ['walking_access', 'competitors', 'current_premises', 'rent',
      'permitted_pilates_use', 'owner_confirmed_inputs'] as const,
    limitation: 'Published HDB dwelling units are a housing-stock proxy, not Pilates demand or proof these are Singapore’s best areas.',
    outcome: 'insufficient_evidence' as const };
}
