import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkEvidenceClaim } from '../src/providers/evidence-claim-check';

const development = () => JSON.parse(readFileSync(resolve('src/data/snapshots/2026-10-05/developments.json'), 'utf8'));
const cluster = () => JSON.parse(readFileSync(resolve('src/data/snapshots/2026-10-06/block-cluster.json'), 'utf8'));
const sources = () => ({ developmentRecord: development(), blockCluster: cluster() });

describe('provider-independent four-verdict evidence check', () => {
  it('supports an exact checked block claim with provenance but no site approval', () => {
    expect(checkEvidenceClaim({ claim: 'Block 442A New Punggol Road has 194 published HDB dwelling units.', excerpt: '"total_dwelling_units":"194"', sourceIds: ['hdb-property-442a'] }, sources())).toMatchObject({
      verdict: 'supported', provider: 'deterministic', siteEvidenceStatus: 'insufficient_evidence',
      citedSources: [{ id: 'hdb-property-442a', sourceUrl: expect.any(String), retrievedAt: expect.any(String), geographicScope: expect.any(String) }],
    });
  });

  it('contradicts only an exact alternate month in the reviewed HDB completion sentence', () => {
    const record = development();
    const cited = record.decisionClaims[0];
    expect(checkEvidenceClaim({ claim: cited.claim.replace('January 2025', 'February 2025'), excerpt: cited.evidenceExcerpt, sourceIds: cited.sourceIds }, sources())).toMatchObject({ verdict: 'contradicted', citedSources: [{ id: cited.sourceIds[0] }] });
  });

  it('returns not established for unsupported claims even if a model suggests support', () => {
    expect(checkEvidenceClaim({ claim: 'Block 442A New Punggol Road has 999 published HDB dwelling units.', excerpt: '"total_dwelling_units":"194"', sourceIds: ['hdb-property-442a'] }, sources(), { verdict: 'supported' })).toMatchObject({ verdict: 'contradicted', provider: 'deterministic' });
    expect(checkEvidenceClaim({ claim: 'Residents will buy Pilates classes.', excerpt: '"total_dwelling_units":"194"', sourceIds: ['hdb-property-442a'] }, sources(), { verdict: 'supported' })).toMatchObject({ verdict: 'not_established', provider: 'deterministic' });
  });

  it('routes a claim citing multiple checked sources to review with both provenance records', () => {
    const record = development();
    const cited = record.decisionClaims[0];
    expect(checkEvidenceClaim({ claim: cited.claim, excerpt: cited.evidenceExcerpt, sourceIds: ['hdb-punggol-point-completion-annex-a', 'onemap-821442'] }, sources())).toMatchObject({
      verdict: 'review', citedSources: [{ id: 'hdb-punggol-point-completion-annex-a' }, { id: 'onemap-821442' }], siteEvidenceStatus: 'insufficient_evidence',
    });
    expect(checkEvidenceClaim({ claim: cited.claim, excerpt: 'Fabricated passage', sourceIds: ['hdb-punggol-point-completion-annex-a', 'onemap-821442'] }, sources())).toMatchObject({ verdict: 'not_established' });
  });

  it('fails closed on unknown or tampered sources', () => {
    const input = { claim: 'anything', excerpt: 'anything', sourceIds: ['invented'] };
    expect(checkEvidenceClaim(input, sources(), { verdict: 'supported' })).toMatchObject({ verdict: 'not_established' });
    const altered = sources();
    altered.blockCluster.hdbSources[0].snapshotSha256 = '0'.repeat(64);
    expect(checkEvidenceClaim({ claim: 'Block 442A New Punggol Road has 194 published HDB dwelling units.', excerpt: '"total_dwelling_units":"194"', sourceIds: ['hdb-property-442a'] }, altered, { verdict: 'supported' })).toMatchObject({ verdict: 'not_established' });
  });
});
