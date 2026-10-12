import { z } from 'zod';
import { parseBlockCluster } from '../domain/block-cluster';
import { parseDevelopmentRecord } from '../domain/evidence';
import { reviewClaimWithFallback } from './claim-fallback';
import { reviewResearchOutput } from './research-review';
import type { ClaimVerdict } from './claim-check';

const citationSchema = z.object({
  claim: z.string().trim().min(1).max(1000),
  excerpt: z.string().trim().min(1).max(2000),
  sourceIds: z.array(z.string().trim().min(1).max(160)).min(1).max(12),
}).strict();

type Inputs = { developmentRecord?: unknown; blockCluster?: unknown };
type SourceMetadata = { id: string; sourceUrl: string; retrievedAt: string; geographicScope: string; evidenceStatus: 'candidate_cluster' | 'insufficient_evidence'; publicationDate: string | null };
export type EvidenceClaimResult = { verdict: ClaimVerdict; provider: 'deterministic'; siteEvidenceStatus: 'insufficient_evidence'; citedSources: SourceMetadata[]; reason?: string };

/** One provider-independent verdict boundary over currently reviewed source adapters. */
export function checkEvidenceClaim(citationInput: unknown, sourcesInput: unknown, _modelSuggestion?: unknown): EvidenceClaimResult {
  const base = { provider: 'deterministic' as const, siteEvidenceStatus: 'insufficient_evidence' as const };
  const fail = (reason: string): EvidenceClaimResult => ({ ...base, verdict: 'not_established', citedSources: [], reason });
  const parsedCitation = citationSchema.safeParse(citationInput);
  if (!parsedCitation.success || new Set(parsedCitation.data.sourceIds).size !== parsedCitation.data.sourceIds.length) return fail('invalid_citation');
  if (!sourcesInput || typeof sourcesInput !== 'object') return fail('invalid_source');
  const sources = sourcesInput as Inputs;
  const citation = parsedCitation.data;
  const needsDevelopment = citation.sourceIds.some(id => id === 'hdb-punggol-point-completion-annex-a' || id === 'onemap-821442');
  const needsCluster = citation.sourceIds.some(id => id.startsWith('hdb-property-'));
  const development = needsDevelopment ? parseDevelopmentRecord(sources.developmentRecord) : null;
  const cluster = needsCluster ? parseBlockCluster(sources.blockCluster) : null;
  if (development && !development.success || cluster && !cluster.success) return fail('invalid_source');
  const metadata = new Map<string, SourceMetadata>();
  if (development?.success) for (const source of development.data.sources) metadata.set(source.id, {
    id: source.id, sourceUrl: source.sourceUrl, retrievedAt: source.retrievedAt,
    geographicScope: source.geographicScope, evidenceStatus: development.data.evidenceStatus,
    publicationDate: source.publicationDate,
  });
  if (cluster?.success) for (const source of cluster.data.hdbSources) metadata.set(source.id, {
    id: source.id, sourceUrl: source.sourceUrl, retrievedAt: source.retrievedAt,
    geographicScope: source.geographicScope, evidenceStatus: cluster.data.evidenceStatus,
    publicationDate: source.publicationDate,
  });
  if (citation.sourceIds.some(id => !metadata.has(id))) return fail('unknown_source');
  const citedSources = citation.sourceIds.map(id => metadata.get(id)!);
  if (citation.sourceIds.length > 1) {
    const excerptChecked = citation.sourceIds.some(sourceId => {
      const result = reviewClaimWithFallback({ claim: citation.claim, excerpt: citation.excerpt, sourceId }, sources);
      return result.verdict === 'supported' || result.verdict === 'contradicted';
    });
    return excerptChecked
      ? { ...base, verdict: 'review', citedSources, reason: 'joint_support_not_established' }
      : { ...base, verdict: 'not_established', citedSources, reason: 'excerpt_not_established' };
  }
  const sourceId = citation.sourceIds[0];
  if (sourceId === 'hdb-punggol-point-completion-annex-a' || sourceId === 'onemap-821442') {
    const review = reviewResearchOutput(development!.success ? development!.data : null, {
      claims: [{ text: citation.claim, evidenceIds: [sourceId], evidenceExcerpt: citation.excerpt }],
      conflicts: [], unknowns: [], nextInvestigation: 'Verify any unresolved claim.',
    });
    if (review.status === 'unavailable') return fail('invalid_source');
    return { ...base, verdict: review.claims[0].verdict, citedSources };
  }
  const fallback = reviewClaimWithFallback({ claim: citation.claim, excerpt: citation.excerpt, sourceId }, sources);
  return { ...base, verdict: fallback.verdict, citedSources, ...('reason' in fallback ? { reason: fallback.reason } : {}) };
}
