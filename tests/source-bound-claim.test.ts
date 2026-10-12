import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkReviewedDevelopmentClaim } from '../src/providers/source-bound-claim';

const fixture = () => JSON.parse(readFileSync(resolve('src/data/snapshots/2026-10-05/developments.json'), 'utf8'));

describe('source-bound research claim', () => {
  it('returns reviewed source metadata only for the exact checked claim and excerpt', () => {
    const record = fixture();
    const cited = record.decisionClaims[0];
    expect(checkReviewedDevelopmentClaim(record, { claim: cited.claim, excerpt: cited.evidenceExcerpt, sourceId: cited.sourceIds[0] })).toMatchObject({
      verdict: 'supported',
      source: { id: cited.sourceIds[0], sourceUrl: expect.stringContaining('hdb.gov.sg'), retrievedAt: expect.any(String), geographicScope: expect.any(String), evidenceStatus: 'insufficient_evidence' },
    });
  });

  it('rejects a real source ID paired with an invented excerpt or unsupported inference', () => {
    const record = fixture();
    const cited = record.decisionClaims[0];
    expect(checkReviewedDevelopmentClaim(record, { claim: cited.claim, excerpt: 'An invented passage.', sourceId: cited.sourceIds[0] })).toMatchObject({ verdict: 'not_established' });
    expect(checkReviewedDevelopmentClaim(record, { claim: 'Phase 2 is occupied by Pilates customers.', excerpt: cited.evidenceExcerpt, sourceId: cited.sourceIds[0] })).toMatchObject({ verdict: 'not_established' });
  });

  it('rejects a wrong source identity or a tampered reviewed record', () => {
    const record = fixture();
    const cited = record.decisionClaims[0];
    expect(checkReviewedDevelopmentClaim(record, { claim: cited.claim, excerpt: cited.evidenceExcerpt, sourceId: 'onemap-821442' })).toMatchObject({ verdict: 'not_established' });
    record.sources[0].retrievedAt = '2030-01-01T00:00:00Z';
    expect(checkReviewedDevelopmentClaim(record, { claim: cited.claim, excerpt: cited.evidenceExcerpt, sourceId: cited.sourceIds[0] })).toMatchObject({ verdict: 'not_established' });
  });

  it('fails closed on a malformed model-supplied citation', () => {
    expect(checkReviewedDevelopmentClaim(fixture(), null as any)).toMatchObject({ verdict: 'not_established' });
  });
});
