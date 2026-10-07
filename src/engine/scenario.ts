import type { BusinessProfile } from "../domain/business";
import {
  calculateBreakEven,
  calculateContributionPerPaidVisit,
  calculateMonthlyCapacity,
  calculateMonthlyFixedCost,
} from "./economics";

export type SyntheticScenarioInput = {
  monthlyRentSgd: number;
  paidVisitUtilisation: number;
  projectedDevelopmentCompletionMonths: number;
  developmentDelayMonths: number;
  proposedOpeningMonths: number;
  developmentProvenance: "synthetic_assumption";
  occupancyLagMonths: number;
  occupancyProvenance: "synthetic_assumption";
};

function nonnegativeWholeMonths(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${label} must be a nonnegative whole number of months`);
  return value;
}

/** Scenario arithmetic only: no observed demand, housing date, or final site decision. */
export function runSyntheticScenario(profile: BusinessProfile, input: SyntheticScenarioInput) {
  if (input.developmentProvenance !== "synthetic_assumption") throw new RangeError("Development timing must be a synthetic assumption");
  if (input.occupancyProvenance !== "synthetic_assumption") throw new RangeError("Occupancy timing must be a synthetic assumption");
  if (!Number.isFinite(input.paidVisitUtilisation) || input.paidVisitUtilisation < 0 || input.paidVisitUtilisation > 1) {
    throw new RangeError("Paid-visit utilisation must be between zero and one");
  }
  const completionMonths = nonnegativeWholeMonths(input.projectedDevelopmentCompletionMonths, "Development completion");
  const delayMonths = nonnegativeWholeMonths(input.developmentDelayMonths, "Development delay");
  const occupancyLagMonths = nonnegativeWholeMonths(input.occupancyLagMonths, "Occupancy lag");
  const openingMonths = nonnegativeWholeMonths(input.proposedOpeningMonths, "Proposed opening");
  if (openingMonths < profile.timing.earliestOpeningMonths.value || openingMonths > profile.timing.latestOpeningMonths.value) {
    throw new RangeError("Proposed opening must fall within the approved synthetic horizon");
  }
  const projectedDevelopmentCompletionMonths = completionMonths + delayMonths;
  if (!Number.isSafeInteger(projectedDevelopmentCompletionMonths)) throw new RangeError("Development timing is outside the supported range");
  const syntheticOccupancyStartMonths = projectedDevelopmentCompletionMonths + occupancyLagMonths;
  if (!Number.isSafeInteger(syntheticOccupancyStartMonths)) throw new RangeError("Occupancy timing is outside the supported range");

  const capacity = calculateMonthlyCapacity({
    sellableSeatsPerClass: profile.capacity.sellableSeatsPerClass.value,
    scheduledClassesPerWeek: profile.capacity.scheduledClassesPerWeek.value,
    weeksPerMonth: profile.capacity.weeksPerMonth.value,
  });
  const contributionPerPaidVisit = calculateContributionPerPaidVisit({
    realisedRevenuePerVisit: profile.economics.averageRealisedRevenuePerPaidVisit.value,
    variableCostPerVisit: profile.economics.variableCostPerPaidVisit.value,
  });
  const monthlyFixedCost = calculateMonthlyFixedCost({
    averageClassesPerMonth: capacity.averageClassesPerMonth,
    instructorCostPerScheduledClass: profile.economics.instructorCostPerScheduledClass.value,
    otherFixedMonthlyCosts: profile.economics.otherFixedMonthlyCosts.value,
    rentPerMonth: input.monthlyRentSgd,
  });
  const breakEven = calculateBreakEven({
    monthlyFixedCost,
    contributionPerPaidVisit,
    averageSeatVisitsPerMonth: capacity.averageSeatVisitsPerMonth,
  });
  // Whole paid visits make the monthly cash calculation conservative at fractional average capacity.
  const paidVisitsPerAverageMonth = Math.floor(capacity.averageSeatVisitsPerMonth * input.paidVisitUtilisation);
  const surplusCents = paidVisitsPerAverageMonth * Math.round(contributionPerPaidVisit * 100) - Math.round(monthlyFixedCost * 100);
  if (!Number.isSafeInteger(surplusCents)) throw new RangeError("Monthly operating surplus is outside the supported range");
  const monthlyOperatingSurplusSgd = surplusCents / 100;
  return {
    scenarioProvenance: "synthetic_assumption" as const,
    averageSeatVisitsPerMonth: capacity.averageSeatVisitsPerMonth,
    paidVisitsPerAverageMonth,
    monthlyOperatingSurplusSgd,
    requiredPaidVisitsPerMonth: breakEven.requiredPaidVisitsPerMonth,
    breakEvenAverageUtilisation: breakEven.breakEvenAverageUtilisation,
    economicCondition: monthlyOperatingSurplusSgd > 0 ? "surplus" as const : monthlyOperatingSurplusSgd < 0 ? "deficit" as const : "break_even" as const,
    projectedDevelopmentCompletionMonths,
    timingCondition: projectedDevelopmentCompletionMonths <= openingMonths ? "synthetic_event_by_opening" as const : "synthetic_event_after_opening" as const,
    occupancyProvenance: "synthetic_assumption" as const,
    syntheticOccupancyStartMonths,
    occupancyCondition: syntheticOccupancyStartMonths <= openingMonths ? "synthetic_occupancy_by_opening" as const : "synthetic_occupancy_after_opening" as const,
  };
}
