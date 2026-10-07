import type { BusinessProfile } from "../domain/business";
import { assembleGate2Comparison } from "../domain/gate2-comparison";
import { runSyntheticScenario, type SyntheticScenarioInput } from "./scenario";

type HypotheticalDecisionInput = SyntheticScenarioInput & {
  openingInvestmentSgd: number;
  availableRunwayMonths: number;
  premisesUseAssumption: "assumed_permitted" | "assumed_not_permitted";
};

/** Revalidates original evidence before returning the current all-abstain cluster status. */
export function decideReviewedCluster(input: Parameters<typeof assembleGate2Comparison>[0], clusterId: string) {
  const comparison = assembleGate2Comparison(input);
  const cluster = comparison.clusters.find(candidate => candidate.id === clusterId);
  if (!cluster) throw new RangeError("Unknown reviewed cluster ID");
  return {
    clusterId: cluster.id,
    outcome: cluster.decision,
    basis: "reviewed_gate2_snapshot" as const,
    reasonCode: "missing_local_decision_evidence" as const,
  };
}

/** Hypothetical fixture only; its outcome is never a recommendation for a real cluster. */
export function decideHypotheticalScenario(profile: BusinessProfile, input: HypotheticalDecisionInput) {
  const scenario = runSyntheticScenario(profile, input);
  if (!Number.isSafeInteger(Math.round(input.openingInvestmentSgd * 100)) || input.openingInvestmentSgd < 0 ||
      Math.abs(input.openingInvestmentSgd * 100 - Math.round(input.openingInvestmentSgd * 100)) > 1e-7) {
    throw new RangeError("Opening investment must be a nonnegative SGD amount with at most two decimals");
  }
  if (!Number.isSafeInteger(input.availableRunwayMonths) || input.availableRunwayMonths < 0) {
    throw new RangeError("Available runway must be nonnegative whole months");
  }
  if (input.premisesUseAssumption !== "assumed_permitted" && input.premisesUseAssumption !== "assumed_not_permitted") {
    throw new RangeError("A synthetic premises-use assumption is required");
  }
  const stress = runSyntheticScenario(profile, { ...input, monthlyRentSgd: Math.max(input.monthlyRentSgd, profile.economics.monthlyRent.high) });
  const lowestRent = runSyntheticScenario(profile, { ...input, monthlyRentSgd: profile.economics.monthlyRent.low });
  const basis = "synthetic_fixture_only" as const;
  if (input.openingInvestmentSgd > profile.economics.openingInvestmentMaximum.value) {
    return { outcome: "no_go" as const, basis, reasonCode: "opening_investment_exceeds_cap" as const };
  }
  if (input.availableRunwayMonths < profile.economics.minimumOperatingRunwayMonths.value) {
    return { outcome: "no_go" as const, basis, reasonCode: "runway_below_minimum" as const };
  }
  if (input.premisesUseAssumption === "assumed_not_permitted") {
    return { outcome: "no_go" as const, basis, reasonCode: "premises_use_assumed_not_permitted" as const };
  }
  if (lowestRent.breakEvenAverageUtilisation > profile.decisionPolicy.maximumStressBreakEvenUtilisation.value) {
    return { outcome: "no_go" as const, basis, reasonCode: "lowest_rent_economics_fail" as const };
  }
  if (scenario.breakEvenAverageUtilisation > profile.decisionPolicy.maximumBaseBreakEvenUtilisation.value ||
      stress.breakEvenAverageUtilisation > profile.decisionPolicy.maximumStressBreakEvenUtilisation.value) {
    return { outcome: "wait" as const, basis, reasonCode: "rent_terms_need_improvement" as const,
      reviewCondition: "Obtain a lower rent assumption or quote" as const, reviewMonthsFromAnalysis: 1 };
  }
  if (scenario.economicCondition === "deficit") {
    return { outcome: "wait" as const, basis, reasonCode: "paid_visits_need_validation" as const,
      reviewCondition: "Validate a paid-visit level that covers costs" as const, reviewMonthsFromAnalysis: 1 };
  }
  if (scenario.timingCondition === "synthetic_event_after_opening") {
    return { outcome: "wait" as const, basis, reasonCode: "synthetic_completion_after_opening" as const,
      reviewCondition: scenario.syntheticOccupancyStartMonths > scenario.projectedDevelopmentCompletionMonths
        ? "Recheck synthetic completion and occupancy timing assumptions" as const
        : "Recheck the synthetic development completion assumption" as const,
      reviewMonthsFromAnalysis: scenario.syntheticOccupancyStartMonths };
  }
  if (scenario.occupancyCondition === "synthetic_occupancy_after_opening") {
    return { outcome: "wait" as const, basis, reasonCode: "synthetic_occupancy_after_opening" as const,
      reviewCondition: "Recheck the synthetic occupancy timing assumption" as const,
      reviewMonthsFromAnalysis: scenario.syntheticOccupancyStartMonths };
  }
  return { outcome: "investigate" as const, basis, reasonCode: "synthetic_constraints_pass" as const };
}

export function decideReviewedPortfolio(input: Parameters<typeof assembleGate2Comparison>[0]) {
  const comparison = assembleGate2Comparison(input);
  return {
    outcome: comparison.decision,
    basis: "reviewed_gate2_snapshot" as const,
    selectedCandidateId: null,
    reasonCode: "missing_local_decision_evidence" as const,
    candidates: comparison.clusters.map(cluster => ({ id: cluster.id, outcome: cluster.decision })),
  };
}

export function decideHypotheticalPortfolio(profile: BusinessProfile, candidates: readonly { id: string; scenario: HypotheticalDecisionInput }[]) {
  if (!Array.isArray(candidates) || candidates.length !== 3) throw new RangeError("Exactly three synthetic candidates are required");
  for (let index = 0; index < 3; index++) {
    if (!Object.hasOwn(candidates, index) || !candidates[index]) throw new RangeError("Three actual candidates are required; a candidate is missing");
  }
  const ids = candidates.map(candidate => candidate.id);
  if (ids.some(id => typeof id !== "string" || !id.trim() || id !== id.trim())) {
    throw new RangeError("Synthetic candidate IDs must be nonempty and have no surrounding whitespace");
  }
  if (new Set(ids).size !== 3) throw new RangeError("Synthetic candidate IDs must be unique");
  const results = candidates.map(candidate => ({ id: candidate.id, ...decideHypotheticalScenario(profile, candidate.scenario) }));
  const allFail = results.every(candidate => candidate.outcome === "no_go");
  return {
    outcome: allFail ? "no_go" as const : "insufficient_evidence" as const,
    basis: "synthetic_fixture_only" as const,
    selectedCandidateId: null,
    reasonCode: allFail ? "all_synthetic_candidates_fail" as const : "selection_requires_evidence_and_comparison" as const,
    candidates: results,
  };
}
