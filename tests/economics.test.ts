import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBusinessProfile } from "../src/domain/business";
import {
  calculateBreakEven,
  calculateContributionPerPaidVisit,
  calculateMonthlyCapacity,
  calculateMonthlyFixedCost,
} from "../src/engine/economics";

function syntheticProfile() {
  const raw = JSON.parse(readFileSync(resolve(process.cwd(), "src/data/demo/business-profile.json"), "utf8"));
  const parsed = parseBusinessProfile(raw);
  if (!parsed.success) throw new Error("Approved synthetic profile is invalid");
  return parsed.data;
}

describe("Gate 3 deterministic class-only economics", () => {
  it("derives monthly scheduled classes and sellable seat visits from the approved fixture", () => {
    const profile = syntheticProfile();
    const capacity = calculateMonthlyCapacity({
      sellableSeatsPerClass: profile.capacity.sellableSeatsPerClass.value,
      scheduledClassesPerWeek: profile.capacity.scheduledClassesPerWeek.value,
      weeksPerMonth: profile.capacity.weeksPerMonth.value,
    });
    expect(capacity).toEqual({ averageClassesPerMonth: 129.9, averageSeatVisitsPerMonth: 1299 });
  });

  it("derives contribution and fixed monthly cost without treating capacity as demand", () => {
    const profile = syntheticProfile();
    const capacity = calculateMonthlyCapacity({ sellableSeatsPerClass: 10, scheduledClassesPerWeek: 30, weeksPerMonth: 4.33 });
    expect(calculateContributionPerPaidVisit({ realisedRevenuePerVisit: profile.economics.averageRealisedRevenuePerPaidVisit.value, variableCostPerVisit: profile.economics.variableCostPerPaidVisit.value })).toBe(32);
    expect(calculateMonthlyFixedCost({ averageClassesPerMonth: capacity.averageClassesPerMonth, instructorCostPerScheduledClass: 65, otherFixedMonthlyCosts: 5000, rentPerMonth: profile.economics.monthlyRent.base })).toBe(26443.5);
  });

  it("rounds paid visits up to the smallest whole visit that covers fixed cost", () => {
    const result = calculateBreakEven({ monthlyFixedCost: 26443.5, contributionPerPaidVisit: 32, averageSeatVisitsPerMonth: 1299 });
    expect(result.requiredPaidVisitsPerMonth).toBe(827);
    expect(result.breakEvenAverageUtilisation).toBeCloseTo(827 / 1299, 12);
    expect(result.capacityStatus).toBe("within_average_capacity");
    expect(826 * 32).toBeLessThan(26443.5);
    expect(827 * 32).toBeGreaterThanOrEqual(26443.5);
  });

  it("flags break-even above available capacity instead of calling it viable", () => {
    const result = calculateBreakEven({ monthlyFixedCost: 1300, contributionPerPaidVisit: 10, averageSeatVisitsPerMonth: 100 });
    expect(result).toEqual({ requiredPaidVisitsPerMonth: 130, breakEvenAverageUtilisation: 1.3, capacityStatus: "impossible_at_average_capacity" });
  });

  it("rejects non-positive contribution and invalid numeric inputs", () => {
    expect(() => calculateContributionPerPaidVisit({ realisedRevenuePerVisit: 3, variableCostPerVisit: 3 })).toThrow(/positive contribution/i);
    expect(() => calculateContributionPerPaidVisit({ realisedRevenuePerVisit: 2, variableCostPerVisit: 3 })).toThrow(/positive contribution/i);
    expect(() => calculateMonthlyCapacity({ sellableSeatsPerClass: 0, scheduledClassesPerWeek: 30, weeksPerMonth: 4.33 })).toThrow();
    expect(() => calculateMonthlyCapacity({ sellableSeatsPerClass: 10, scheduledClassesPerWeek: Number.POSITIVE_INFINITY, weeksPerMonth: 4.33 })).toThrow();
    expect(() => calculateMonthlyFixedCost({ averageClassesPerMonth: 10, instructorCostPerScheduledClass: 65, otherFixedMonthlyCosts: -1, rentPerMonth: 1000 })).toThrow();
    expect(() => calculateBreakEven({ monthlyFixedCost: 100, contributionPerPaidVisit: 10, averageSeatVisitsPerMonth: 0 })).toThrow();
  });

  it("keeps fractional average capacity explicit and rejects non-finite utilisation", () => {
    expect(calculateBreakEven({ monthlyFixedCost: 10, contributionPerPaidVisit: 10, averageSeatVisitsPerMonth: 1.5 })).toEqual({
      requiredPaidVisitsPerMonth: 1,
      breakEvenAverageUtilisation: 1 / 1.5,
      capacityStatus: "within_average_capacity",
    });
    expect(() => calculateBreakEven({ monthlyFixedCost: 100, contributionPerPaidVisit: 10, averageSeatVisitsPerMonth: Number.MIN_VALUE })).toThrow(/utilisation/i);
  });
});
