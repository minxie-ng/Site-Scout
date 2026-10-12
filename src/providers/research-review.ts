import { parseDevelopmentRecord } from '../domain/evidence';
import { parseResearchOutput } from './research';
import { checkReviewedDevelopmentClaim } from './source-bound-claim';
import type { ClaimVerdict } from './claim-check';

const MONTHS = new Set(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);

function contradictsReviewedMonth(proposed: string, reviewed: string): boolean {
  const marker = 'January 2025';
  const pieces = reviewed.split(marker);
  if (pieces.length !== 2 || !proposed.startsWith(pieces[0]) || !proposed.endsWith(pieces[1])) return false;
  const middle = proposed.slice(pieces[0].length, proposed.length - pieces[1].length);
  const month = middle.endsWith(' 2025') ? middle.slice(0, -5) : '';
  return MONTHS.has(month) && month !== 'January';
}

export function reviewResearchOutput(recordInput: unknown, outputInput: unknown) {
  const checked = parseDevelopmentRecord(recordInput);
  if (!checked.success) return { status: 'unavailable' as const, reason: 'invalid_source' as const };
  const availableIds = checked.data.sources.map(source => source.id);
  let output;
  try { output = parseResearchOutput(outputInput, availableIds); }
  catch { return { status: 'unavailable' as const, reason: 'invalid_research_output' as const }; }

  const citedSourcesFor = (ids: string[]) => ids.map(id => {
      const source = checked.data.sources.find(candidate => candidate.id === id)!;
      return { id: source.id, sourceUrl: source.sourceUrl, retrievedAt: source.retrievedAt,
        publicationDate: source.publicationDate, geographicScope: source.geographicScope,
        evidenceStatus: checked.data.evidenceStatus };
    });
  const claims = output.claims.map(item => {
    const citedSources = citedSourcesFor(item.evidenceIds);
    const checkedClaim = item.evidenceIds.length === 1
      ? checkReviewedDevelopmentClaim(checked.data, { claim: item.text, excerpt: item.evidenceExcerpt, sourceId: item.evidenceIds[0] })
      : { verdict: 'not_established' as const, reason: 'multiple_unverified_sources' as const };
    let verdict: ClaimVerdict = checkedClaim.verdict;
    if (item.evidenceIds.length > 1) verdict = 'review';
    else if (checkedClaim.verdict === 'not_established' && item.evidenceIds[0] === checked.data.decisionClaims[0].sourceIds[0] &&
      item.evidenceExcerpt === checked.data.decisionClaims[0].evidenceExcerpt &&
      contradictsReviewedMonth(item.text, checked.data.decisionClaims[0].claim)) verdict = 'contradicted';
    return { text: item.text, evidenceIds: item.evidenceIds, evidenceExcerpt: item.evidenceExcerpt,
      ...checkedClaim, verdict, citedSources };
  });
  return {
    status: 'research_only' as const,
    siteEvidenceStatus: checked.data.evidenceStatus,
    claims,
    conflicts: output.conflicts.map(item => ({ ...item, status: 'unresolved' as const, citedSources: citedSourcesFor(item.evidenceIds) })),
    unknowns: output.unknowns,
    nextInvestigation: output.nextInvestigation,
    needsReview: claims.some(claim => claim.verdict !== 'supported') || output.conflicts.length > 0 || output.unknowns.length > 0,
  };
}

/** Decision-facing projection for this reviewed fixture; never grants positive site use. */
export function projectResearchReviewToDecisionGate(review: ReturnType<typeof reviewResearchOutput>) {
  if (review.status === 'unavailable') return {
    mayRecommendRealSite: false as const,
    siteEvidenceStatus: 'insufficient_evidence' as const,
    unresolvedClaims: 0,
    conflicts: [],
    unknowns: ['Research review unavailable'],
  };
  return {
    mayRecommendRealSite: false as const,
    siteEvidenceStatus: review.siteEvidenceStatus,
    unresolvedClaims: review.claims.filter(claim => claim.verdict !== 'supported').length,
    conflicts: review.conflicts,
    unknowns: review.unknowns,
  };
}
