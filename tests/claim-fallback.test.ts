import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { reviewClaimWithFallback } from '../src/providers/claim-fallback';

const development = () => JSON.parse(readFileSync(resolve('src/data/snapshots/2026-10-05/developments.json'), 'utf8'));
const cluster = () => JSON.parse(readFileSync(resolve('src/data/snapshots/2026-10-06/block-cluster.json'), 'utf8'));
const blockClaim = {
  claim: 'Block 442A New Punggol Road has 194 published HDB dwelling units.',
  excerpt: '"total_dwelling_units":"194"',
  sourceId: 'hdb-property-442a',
};

describe('provider-independent checked-claim fallback', () => {
  it('supports the reviewed HDB block fact with source metadata, independent of model availability', () => {
    expect(reviewClaimWithFallback(blockClaim, { developmentRecord: development(), blockCluster: cluster() })).toMatchObject({
      verdict: 'supported', provider: 'deterministic', source: {
        id: 'hdb-property-442a', sourceUrl: expect.stringContaining('data.gov.sg'), retrievedAt: expect.any(String),
        geographicScope: expect.stringContaining('442A'), evidenceStatus: 'candidate_cluster',
      },
    });
  });

  it('does not let a model support a contradicted unit count or fabricated excerpt', () => {
    const inputs = [
      { ...blockClaim, claim: 'Block 442A New Punggol Road has 999 published HDB dwelling units.' },
      { ...blockClaim, excerpt: '"total_dwelling_units":"999"' },
    ];
    expect(reviewClaimWithFallback(inputs[0], { developmentRecord: development(), blockCluster: cluster() }, { verdict: 'supported' })).toMatchObject({ verdict: 'contradicted', provider: 'deterministic' });
    expect(reviewClaimWithFallback(inputs[1], { developmentRecord: development(), blockCluster: cluster() }, { verdict: 'supported' })).toMatchObject({ verdict: 'not_established', provider: 'deterministic' });
  });

  it('does not call a leading-zero rendering of the same count a contradiction', () => {
    expect(reviewClaimWithFallback({ ...blockClaim, claim: 'Block 442A New Punggol Road has 0194 published HDB dwelling units.' }, { blockCluster: cluster() })).toMatchObject({ verdict: 'not_established' });
  });

  it('rejects a tampered cluster even when the model suggests support', () => {
    const altered = cluster();
    altered.hdbSources[0].snapshotSha256 = '0'.repeat(64);
    expect(reviewClaimWithFallback(blockClaim, { developmentRecord: development(), blockCluster: altered }, { verdict: 'supported' })).toMatchObject({ verdict: 'not_established', reason: 'invalid_source' });
  });

  it('retains the earlier checked development claim through the same interface', () => {
    const record = development();
    const cited = record.decisionClaims[0];
    expect(reviewClaimWithFallback({ claim: cited.claim, excerpt: cited.evidenceExcerpt, sourceId: cited.sourceIds[0] }, { developmentRecord: record, blockCluster: cluster() })).toMatchObject({ verdict: 'supported', source: { id: cited.sourceIds[0], evidenceStatus: 'insufficient_evidence' } });
  });

  it('fails closed on malformed source input and unknown source IDs', () => {
    expect(reviewClaimWithFallback(blockClaim, null as any, { verdict: 'supported' })).toMatchObject({ verdict: 'not_established' });
    expect(reviewClaimWithFallback({ ...blockClaim, sourceId: 'invented' }, { developmentRecord: development(), blockCluster: cluster() }, { verdict: 'supported' })).toMatchObject({ verdict: 'not_established', reason: 'unknown_source' });
  });
});
