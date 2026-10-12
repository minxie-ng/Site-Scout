import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { z } from 'zod';
import { parseBlockCluster } from '../domain/block-cluster';
import { checkReviewedDevelopmentClaim } from './source-bound-claim';

const citationSchema = z.object({ claim: z.string().trim().min(1).max(1000), excerpt: z.string().trim().min(1).max(2000), sourceId: z.string().trim().min(1).max(160) }).strict();

type Sources = { developmentRecord?: unknown; blockCluster?: unknown };
type FallbackResult =
  | { verdict: 'supported' | 'contradicted'; provider: 'deterministic'; source: { id: string; sourceUrl: string; retrievedAt: string; geographicScope: string; evidenceStatus: 'candidate_cluster' | 'insufficient_evidence'; excerpt: string } }
  | { verdict: 'not_established'; provider: 'deterministic'; reason: 'invalid_citation' | 'invalid_source' | 'unsupported_claim' | 'unknown_source' };

function checkedExcerpt(path: string, sha256: string, excerpt: string): boolean {
  try {
    const root = realpathSync(resolve(process.cwd(), 'src/data/snapshots'));
    const file = realpathSync(resolve(process.cwd(), path));
    if (!file.startsWith(root + sep)) return false;
    const bytes = readFileSync(file);
    return createHash('sha256').update(bytes).digest('hex') === sha256 && bytes.toString('utf8').includes(excerpt);
  } catch { return false; }
}

/** A model verdict is deliberately ignored: only checked local evidence can support a claim. */
export function reviewClaimWithFallback(citationInput: unknown, sourcesInput: unknown, _modelSuggestion?: unknown): FallbackResult {
  const parsedCitation = citationSchema.safeParse(citationInput);
  if (!parsedCitation.success) return { verdict: 'not_established', provider: 'deterministic', reason: 'invalid_citation' };
  if (!sourcesInput || typeof sourcesInput !== 'object') return { verdict: 'not_established', provider: 'deterministic', reason: 'invalid_source' };
  const sources = sourcesInput as Sources;
  const citation = parsedCitation.data;
  if (citation.sourceId === 'hdb-punggol-point-completion-annex-a') {
    const checked = checkReviewedDevelopmentClaim(sources.developmentRecord, citation);
    if (checked.verdict !== 'supported') return { verdict: 'not_established', provider: 'deterministic', reason: checked.reason };
    return { verdict: 'supported', provider: 'deterministic', source: checked.source };
  }
  if (!citation.sourceId.startsWith('hdb-property-')) return { verdict: 'not_established', provider: 'deterministic', reason: 'unknown_source' };
  const parsedCluster = parseBlockCluster(sources.blockCluster);
  if (!parsedCluster.success) return { verdict: 'not_established', provider: 'deterministic', reason: 'invalid_source' };
  const cluster = parsedCluster.data;
  const member = cluster.members.find(item => item.hdbResidentialEvidence.sourceId === citation.sourceId);
  const source = cluster.hdbSources.find(item => item.id === citation.sourceId);
  if (!member || !source) return { verdict: 'not_established', provider: 'deterministic', reason: 'unknown_source' };
  const expectedClaim = `Block ${member.blockId} ${member.roadName.toLowerCase().replace(/\b\w/g, character => character.toUpperCase())} has ${member.hdbResidentialEvidence.totalDwellingUnits} published HDB dwelling units.`;
  const expectedExcerpt = `"total_dwelling_units":"${member.hdbResidentialEvidence.totalDwellingUnits}"`;
  if (citation.excerpt !== expectedExcerpt || !checkedExcerpt(source.snapshotPath, source.snapshotSha256, expectedExcerpt)) {
    return { verdict: 'not_established', provider: 'deterministic', reason: 'unsupported_claim' };
  }
  const marker = String(member.hdbResidentialEvidence.totalDwellingUnits);
  const pieces = expectedClaim.split(marker);
  const alternateCount = pieces.length === 2 && citation.claim.startsWith(pieces[0]) && citation.claim.endsWith(pieces[1])
    ? citation.claim.slice(pieces[0].length, citation.claim.length - pieces[1].length) : '';
  const alternateNumber = Number(alternateCount);
  const contradictsCount = /^\d+$/.test(alternateCount) && Number.isSafeInteger(alternateNumber) &&
    alternateNumber !== member.hdbResidentialEvidence.totalDwellingUnits;
  if (citation.claim !== expectedClaim && !contradictsCount) {
    return { verdict: 'not_established', provider: 'deterministic', reason: 'unsupported_claim' };
  }
  return { verdict: contradictsCount ? 'contradicted' : 'supported', provider: 'deterministic', source: {
    id: source.id, sourceUrl: source.sourceUrl, retrievedAt: source.retrievedAt,
    geographicScope: source.geographicScope, evidenceStatus: cluster.evidenceStatus,
    excerpt: expectedExcerpt,
  } };
}
