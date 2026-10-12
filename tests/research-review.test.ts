import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectResearchReviewToDecisionGate, reviewResearchOutput } from '../src/providers/research-review';

const record = () => JSON.parse(readFileSync(resolve('src/data/snapshots/2026-10-05/developments.json'), 'utf8'));
const output = () => {
  const checked = record().decisionClaims[0];
  return {
    claims: [{ text: checked.claim, evidenceIds: checked.sourceIds, evidenceExcerpt: checked.evidenceExcerpt }],
    conflicts: [] as Array<{ description: string; evidenceIds: string[] }>, unknowns: [] as string[], nextInvestigation: 'Verify the block-to-phase relationship.',
  };
};

describe('review of research output against checked evidence', () => {
  it('retains source metadata for a supported sentence but never upgrades the site', () => {
    expect(reviewResearchOutput(record(), output())).toMatchObject({
      status: 'research_only',
      claims: [{ verdict: 'supported', source: { id: 'hdb-punggol-point-completion-annex-a', evidenceStatus: 'insufficient_evidence', sourceUrl: expect.any(String), retrievedAt: expect.any(String), geographicScope: expect.any(String) } }],
      siteEvidenceStatus: 'insufficient_evidence',
      needsReview: false,
    });
  });

  it('marks an exact conflicting completion month contradicted by the reviewed source', () => {
    const proposed = output();
    proposed.claims[0].text = proposed.claims[0].text.replace('January 2025', 'February 2025');
    expect(reviewResearchOutput(record(), proposed)).toMatchObject({ status: 'research_only', claims: [{ verdict: 'contradicted', citedSources: [{ id: 'hdb-punggol-point-completion-annex-a', sourceUrl: expect.any(String), geographicScope: expect.any(String) }] }], needsReview: true });
  });

  it('routes a multi-source claim to review until both sources support the whole claim', () => {
    const proposed = output();
    proposed.claims[0].evidenceIds.push('onemap-821442');
    expect(reviewResearchOutput(record(), proposed)).toMatchObject({ status: 'research_only', claims: [{ verdict: 'review', citedSources: [{ id: 'hdb-punggol-point-completion-annex-a' }, { id: 'onemap-821442' }] }], needsReview: true });
  });

  it('marks an invented inference not established and preserves conflicts and unknowns for review', () => {
    const proposed = output();
    proposed.claims[0].text = 'Phase 2 residents will buy Pilates classes.';
    proposed.conflicts.push({ description: 'Sources disagree on the phase.', evidenceIds: ['hdb-punggol-point-completion-annex-a'] });
    proposed.unknowns.push('Walking access is unknown.');
    const reviewed = reviewResearchOutput(record(), proposed);
    expect(reviewed).toMatchObject({ status: 'research_only', claims: [{ verdict: 'not_established' }], conflicts: [{ description: 'Sources disagree on the phase.' }], unknowns: ['Walking access is unknown.'], needsReview: true });
  });

  it('fails closed on an unrecognized citation or corrupted source record', () => {
    const proposed = output();
    proposed.claims[0].evidenceIds = ['invented'];
    expect(reviewResearchOutput(record(), proposed)).toMatchObject({ status: 'unavailable' });
    const corrupted = record();
    corrupted.sources[0].snapshotSha256 = '0'.repeat(64);
    expect(reviewResearchOutput(corrupted, output())).toMatchObject({ status: 'unavailable' });
  });

  it('passes conflicts, unknowns, and unsupported claims to a fail-closed decision gate', () => {
    const proposed = output();
    proposed.unknowns.push('Lease use is unconfirmed.');
    proposed.conflicts.push({ description: 'Completion status conflicts with another lead.', evidenceIds: ['hdb-punggol-point-completion-annex-a'] });
    proposed.claims[0].text = 'All units are occupied.';
    const gate = projectResearchReviewToDecisionGate(reviewResearchOutput(record(), proposed));
    expect(gate).toMatchObject({ mayRecommendRealSite: false, unresolvedClaims: 1, unknowns: ['Lease use is unconfirmed.'], siteEvidenceStatus: 'insufficient_evidence',
      conflicts: [{ status: 'unresolved', citedSources: [{ id: 'hdb-punggol-point-completion-annex-a', sourceUrl: expect.any(String), retrievedAt: expect.any(String), geographicScope: expect.any(String), evidenceStatus: 'insufficient_evidence' }] }],
    });
    expect(projectResearchReviewToDecisionGate(reviewResearchOutput(record(), output()))).toMatchObject({ mayRecommendRealSite: false, siteEvidenceStatus: 'insufficient_evidence' });
  });
});
