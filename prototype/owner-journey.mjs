import { runOwnerEconomics } from './owner-intake.mjs';
import { isVerifiedPriorityMapFeed } from './priority-map.mjs';

const towns = { PG: 'Punggol', SGN: 'Serangoon', CL: 'Clementi' };

/** Join only a hash-verified sampled area to confirmed operator estimates. */
export function buildOwnerJourney(feed, owner, selected, utilisationPercent) {
  if (!isVerifiedPriorityMapFeed(feed) || !Number.isSafeInteger(selected) || selected < 0 || selected > 2 ||
    !Number.isSafeInteger(utilisationPercent) || utilisationPercent < 0 || utilisationPercent > 100) {
    throw new Error('Checked owner journey unavailable');
  }
  const economics = runOwnerEconomics(owner);
  const priority = feed.priorities[selected];
  const sources = priority.members.map(member => ({ block: member.block, street: member.street,
    oneMapUrl: member.sourceUrl, oneMapRetrievedAt: member.retrievedAt,
    hdbUrl: member.hdbSourceUrl, hdbRetrievedDate: member.hdbRetrievedDate }));
  const economicCondition = utilisationPercent / 100 >= economics.breakEvenAverageUtilisation ?
    'above_class_only_break_even' : 'below_class_only_break_even';
  return { area: towns[priority.townCode], blocks: sources.map(source => source.block), sources,
    snapshotDate: feed.snapshotDate, publishedDwellingUnits: priority.publishedDwellingUnits,
    priority: priority.investigationPriority, utilisationPercent, economicCondition,
    breakEvenPercent: economics.breakEvenAverageUtilisation * 100,
    requiredPaidVisitsPerMonth: economics.requiredPaidVisitsPerMonth,
    rentCeilingSgd: owner.rentCeilingSgd, openingMonths: owner.openingMonths,
    businessFormat: owner.businessFormat.trim(), targetCustomers: owner.targetCustomers.trim(),
    profileStatus: 'owner_confirmed_estimate', areaStatus: 'checked_sample_replay',
    outcome: 'insufficient_evidence', coverage: feed.coverage };
}

export function ownerJourneyMemo(result) {
  if (result?.outcome !== 'insufficient_evidence' || result.profileStatus !== 'owner_confirmed_estimate' ||
    result.areaStatus !== 'checked_sample_replay') throw new Error('Owner memo unavailable');
  const sources = result.sources.map(source =>
    `Block ${source.block} ${source.street}: OneMap checked address replay ${source.oneMapUrl} (retrieved ${source.oneMapRetrievedAt.slice(0, 10)}); HDB checked housing-record replay ${source.hdbUrl} (retrieved ${source.hdbRetrievedDate}).`).join('\n');
  return `SITE SCOUT — INVESTIGATION MEMO\nChecked sample: ${result.area}, Blocks ${result.blocks.join(', ')} (snapshot ${result.snapshotDate}).\nResearch priority ${result.priority} by ${result.publishedDwellingUnits} published dwellings (derived housing-stock proxy); not occupied homes or customer demand.\nOwner-confirmed estimates: ${result.businessFormat}; target ${result.targetCustomers}; rent ceiling S$${result.rentCeilingSgd}; proposed opening in ${result.openingMonths} months.\nAt assumed ${result.utilisationPercent}% paid-seat utilisation, class-only economics are ${result.economicCondition.replaceAll('_', ' ')}. Break-even requires ${result.requiredPaidVisitsPerMonth} paid visits/month (${result.breakEvenPercent.toFixed(1)}% average utilisation) at the rent ceiling. This is not a demand forecast.\nReal location outcome: insufficient_evidence. No exact unit, current rent, permitted Pilates use, local competition, walking access or demand has been verified for this group.\nCoverage: ${result.coverage.checkedPointCount} checked address points, ${result.coverage.eligibleGroupCount} sampled groups, ${result.coverage.unprobedLeadCount.toLocaleString('en-SG')} HDB leads unprobed; 27 whole towns unassessed. No national winner.\nNext investigation: identify one specific commercial unit near these blocks and confirm its current availability, rent, permitted Pilates use and size.\nSources:\n${sources}`;
}
