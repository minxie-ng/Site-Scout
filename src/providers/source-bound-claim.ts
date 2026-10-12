import { parseDevelopmentRecord } from '../domain/evidence';
import { z } from 'zod';

const citationSchema = z.object({ claim: z.string().min(1), excerpt: z.string().min(1), sourceId: z.string().min(1) }).strict();
type Result =
  | { verdict: 'not_established'; reason: 'invalid_source' | 'unsupported_claim' }
  | { verdict: 'supported'; source: { id: string; sourceUrl: string; retrievedAt: string; publicationDate: string | null; geographicScope: string; evidenceStatus: 'insufficient_evidence'; excerpt: string } };

/** Bounded to the single manually reviewed HDB development claim; no arbitrary source admission. */
export function checkReviewedDevelopmentClaim(recordInput: unknown, citationInput: unknown): Result {
  const parsedCitation = citationSchema.safeParse(citationInput);
  if (!parsedCitation.success) return { verdict: 'not_established', reason: 'unsupported_claim' };
  const citation = parsedCitation.data;
  const checked = parseDevelopmentRecord(recordInput);
  if (!checked.success) return { verdict: 'not_established', reason: 'invalid_source' };
  const record = checked.data;
  const claim = record.decisionClaims[0];
  const source = record.sources.find(item => item.id === citation.sourceId);
  if (!source || !claim.sourceIds.includes(source.id) ||
      citation.claim !== claim.claim || citation.excerpt !== claim.evidenceExcerpt) {
    return { verdict: 'not_established', reason: 'unsupported_claim' };
  }
  return { verdict: 'supported', source: {
    id: source.id,
    sourceUrl: source.sourceUrl,
    retrievedAt: source.retrievedAt,
    publicationDate: source.publicationDate,
    geographicScope: source.geographicScope,
    evidenceStatus: record.evidenceStatus,
    excerpt: claim.evidenceExcerpt,
  } };
}
