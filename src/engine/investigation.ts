import type { BusinessProfile } from "../domain/business";
import { assembleGate2Comparison } from "../domain/gate2-comparison";
import { decideHypotheticalScenario, decideReviewedPortfolio } from "./decision";

type Scenario = Parameters<typeof decideHypotheticalScenario>[1];
type InputName = "monthlyRentSgd" | "paidVisitUtilisation" | "developmentDelayMonths";
type Investigation = "obtain_current_exact_unit_rent_quote" | "validate_local_paid_visit_demand" | "verify_development_timing";
type Range = { input: InputName; low: number; high: number; investigation: Investigation };
const investigationFor: Record<InputName, Investigation> = {
  monthlyRentSgd: "obtain_current_exact_unit_rent_quote",
  paidVisitUtilisation: "validate_local_paid_visit_demand",
  developmentDelayMonths: "verify_development_timing",
};

function validateRanges(ranges: readonly Range[]): void {
  if (!Array.isArray(ranges) || ranges.length === 0 || ranges.length > 3) throw new RangeError("One to three uncertain input ranges are required");
  const seen = new Set<string>();
  for (let i = 0; i < ranges.length; i++) {
    if (!Object.hasOwn(ranges, i) || !ranges[i]) throw new RangeError("A range is missing");
    const item: Range = ranges[i];
    if (!Object.hasOwn(investigationFor, item.input) || investigationFor[item.input] !== item.investigation) {
      throw new RangeError("Unsupported input or investigation pairing");
    }
    if (seen.has(item.input)) throw new RangeError("Duplicate uncertain input");
    seen.add(item.input);
    if (!Number.isFinite(item.low) || !Number.isFinite(item.high) || item.low > item.high) throw new RangeError("Invalid uncertain input range");
    if (item.input === "monthlyRentSgd" && (item.low < 0 ||
        !Number.isSafeInteger(Math.round(item.low * 100)) || !Number.isSafeInteger(Math.round(item.high * 100)) ||
        Math.abs(item.low * 100 - Math.round(item.low * 100)) > 1e-7 ||
        Math.abs(item.high * 100 - Math.round(item.high * 100)) > 1e-7)) {
      throw new RangeError("Monthly rent range must contain nonnegative SGD amounts with at most two decimals");
    }
    if (item.input === "paidVisitUtilisation" && (item.low < 0 || item.high > 1)) {
      throw new RangeError("Utilisation range must be between zero and one");
    }
    if (item.input === "developmentDelayMonths" && (!Number.isSafeInteger(item.low) || !Number.isSafeInteger(item.high) || item.low < 0)) {
      throw new RangeError("Development delay range must contain nonnegative whole months");
    }
  }
}

/** One-factor-at-a-time endpoint sensitivity; not a probability or real-site ranking. */
export function selectNextInvestigation(profile: BusinessProfile, baseline: Scenario, ranges: readonly Range[]) {
  validateRanges(ranges);
  for (const range of ranges) {
    if (baseline[range.input] < range.low || baseline[range.input] > range.high) {
      throw new RangeError("Baseline must lie inside every uncertain input range");
    }
  }
  const baselineOutcome = decideHypotheticalScenario(profile, baseline).outcome;
  const sensitivities = ranges.map(range => {
    const lowOutcome = decideHypotheticalScenario(profile, { ...baseline, [range.input]: range.low }).outcome;
    const highOutcome = decideHypotheticalScenario(profile, { ...baseline, [range.input]: range.high }).outcome;
    const distinctOutcomes = new Set([baselineOutcome, lowOutcome, highOutcome]).size;
    return {
      ...range, lowOutcome, highOutcome,
      changesOutcome: distinctOutcomes > 1,
      distinctOutcomes,
      basis: "synthetic_fixture_only" as const,
    };
  });
  // Equal outcome breadths preserve the caller's explicit investigation order.
  const selected = sensitivities.reduce<(typeof sensitivities)[number] | null>(
    (best, current) => current.changesOutcome && (!best || current.distinctOutcomes > best.distinctOutcomes) ? current : best,
    null,
  );
  return {
    basis: "synthetic_fixture_only" as const,
    baselineOutcome,
    selectedInput: selected?.input ?? null,
    nextInvestigation: selected?.investigation ?? null,
    selectedCandidateId: null,
    sensitivities,
  };
}

/** Real clusters remain abstentions; synthetic sensitivity only orders a question to investigate. */
export function selectReviewedNextInvestigation(
  input: Parameters<typeof assembleGate2Comparison>[0], profile: BusinessProfile, baseline: Scenario, ranges: readonly Range[],
) {
  const portfolio = decideReviewedPortfolio(input);
  const sensitivity = selectNextInvestigation(profile, baseline, ranges);
  return {
    ...portfolio,
    selectedCandidateId: null,
    nextInvestigation: sensitivity.nextInvestigation ?? "verify_exact_premises_use_and_availability" as const,
    investigationBasis: sensitivity.nextInvestigation ? "synthetic_sensitivity_proxy" as const : "reviewed_evidence_gap_fallback" as const,
    unmodelledEvidenceGaps: [
      "premises_use_and_availability", "local_competitor_catchments", "walking_access", "owner_confirmed_inputs",
    ] as const,
    sensitivity,
  };
}
