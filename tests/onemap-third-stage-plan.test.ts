import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { eligibleTriples, loadCandidateEligibility } from '../src/domain/candidate-eligibility';
import { loadHdbBlockLeads } from '../src/domain/hdb-block-leads';
import { planThirdStageOneMapProbes } from '../src/providers/onemap-third-stage';

it('plans eight new exact-address probes in each town without a checked three-block group', () => {
  const baseEligibility = loadCandidateEligibility(2);
  const base = baseEligibility.checkedPoints;
  expect(baseEligibility.checkedAddressPointCount).toBe(89);
  const inventory = loadHdbBlockLeads();
  const second = JSON.parse(readFileSync('src/data/snapshots/2026-10-12/onemap-second-stage.json', 'utf8'));
  const unresolved = second.entries.filter((entry: any) => entry.reviewStatus === 'not_found')
    .map((entry: any) => `${entry.townCode}:${entry.block}:${entry.street}`);
  const plan = planThirdStageOneMapProbes(inventory, base, eligibleTriples(base), unresolved);
  expect(plan.maxRequests).toBe(80);
  expect(plan.probes).toHaveLength(80);
  expect(plan.targetCodes).toHaveLength(10);
  expect(plan.outcome).toBe('insufficient_evidence');
  expect(plan.proximityStatus).toBe('unverified');
  const used = new Set(base.map(point => `${point.townCode}:${point.block}:${point.street}`));
  for (const code of plan.targetCodes) {
    const local = plan.probes.filter(probe => probe.townCode === code);
    expect(local).toHaveLength(8);
    for (const lead of local) {
      const id = `${lead.townCode}:${lead.block}:${lead.street}`;
      expect(used.has(id) || unresolved.includes(id)).toBe(false);
      used.add(id);
    }
  }
});
