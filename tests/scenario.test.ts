import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBusinessProfile } from "../src/domain/business";
import { runSyntheticScenario } from "../src/engine/scenario";

const rawProfile = JSON.parse(readFileSync(resolve(process.cwd(), "src/data/demo/business-profile.json"), "utf8"));
const parsedProfile = parseBusinessProfile(rawProfile);
if (!parsedProfile.success) throw new Error("Approved synthetic profile is invalid");
const profile = parsedProfile.data;

const baseScenario = {
  monthlyRentSgd: 13_000,
  paidVisitUtilisation: 0.7,
  projectedDevelopmentCompletionMonths: 20,
  developmentDelayMonths: 0,
  proposedOpeningMonths: 24,
  developmentProvenance: "synthetic_assumption" as const,
  occupancyLagMonths: 0,
  occupancyProvenance: "synthetic_assumption" as const,
};

describe("Gate 3 synthetic adverse scenarios", () => {
  it("turns operating surplus into deficit when the editable rent rises", () => {
    const base = runSyntheticScenario(profile, baseScenario);
    const highRent = runSyntheticScenario(profile, { ...baseScenario, monthlyRentSgd: 16_000 });
    expect(base).toMatchObject({ scenarioProvenance: "synthetic_assumption", paidVisitsPerAverageMonth: 909, monthlyOperatingSurplusSgd: 2644.5, requiredPaidVisitsPerMonth: 827, economicCondition: "surplus" });
    expect(highRent).toMatchObject({ paidVisitsPerAverageMonth: 909, monthlyOperatingSurplusSgd: -355.5, requiredPaidVisitsPerMonth: 921, economicCondition: "deficit" });
  });

  it("turns operating surplus into deficit at lower paid-visit utilisation without changing capacity", () => {
    const base = runSyntheticScenario(profile, baseScenario);
    const lower = runSyntheticScenario(profile, { ...baseScenario, paidVisitUtilisation: 0.6 });
    expect(lower.averageSeatVisitsPerMonth).toBe(base.averageSeatVisitsPerMonth);
    expect(lower.requiredPaidVisitsPerMonth).toBe(base.requiredPaidVisitsPerMonth);
    expect(lower).toMatchObject({ paidVisitsPerAverageMonth: 779, monthlyOperatingSurplusSgd: -1515.5, economicCondition: "deficit" });
  });

  it("moves a labelled synthetic development event past the proposed opening after a delay", () => {
    const base = runSyntheticScenario(profile, baseScenario);
    const delayed = runSyntheticScenario(profile, { ...baseScenario, developmentDelayMonths: 6 });
    expect(base).toMatchObject({ projectedDevelopmentCompletionMonths: 20, timingCondition: "synthetic_event_by_opening" });
    expect(delayed).toMatchObject({ projectedDevelopmentCompletionMonths: 26, timingCondition: "synthetic_event_after_opening" });
    expect(delayed.monthlyOperatingSurplusSgd).toBe(base.monthlyOperatingSurplusSgd);
  });

  it("keeps synthetic occupancy later than completion without changing paid visits or economics", () => {
    const base = runSyntheticScenario(profile, baseScenario);
    const lagged = runSyntheticScenario(profile, { ...baseScenario, occupancyLagMonths: 6 });
    expect(base).toMatchObject({ projectedDevelopmentCompletionMonths: 20, syntheticOccupancyStartMonths: 20, occupancyCondition: "synthetic_occupancy_by_opening" });
    expect(lagged).toMatchObject({
      projectedDevelopmentCompletionMonths: 20,
      syntheticOccupancyStartMonths: 26,
      occupancyCondition: "synthetic_occupancy_after_opening",
      occupancyProvenance: "synthetic_assumption",
    });
    expect(lagged.paidVisitsPerAverageMonth).toBe(base.paidVisitsPerAverageMonth);
    expect(lagged.monthlyOperatingSurplusSgd).toBe(base.monthlyOperatingSurplusSgd);
  });

  it("rejects missing or invalid synthetic occupancy assumptions", () => {
    expect(() => runSyntheticScenario(profile, { ...baseScenario, occupancyLagMonths: -1 })).toThrow(/occupancy/i);
    expect(() => runSyntheticScenario(profile, { ...baseScenario, occupancyLagMonths: 1.5 })).toThrow(/occupancy/i);
    expect(() => runSyntheticScenario(profile, { ...baseScenario, occupancyProvenance: "observed" as never })).toThrow(/occupancy|synthetic/i);
    const missing = { ...baseScenario } as Record<string, unknown>;
    delete missing.occupancyLagMonths;
    expect(() => runSyntheticScenario(profile, missing as typeof baseScenario)).toThrow(/occupancy/i);
  });

  it("rejects invalid utilisation, delay, and out-of-horizon opening inputs", () => {
    expect(() => runSyntheticScenario(profile, { ...baseScenario, paidVisitUtilisation: 1.1 })).toThrow(/utilisation/i);
    expect(() => runSyntheticScenario(profile, { ...baseScenario, developmentDelayMonths: -1 })).toThrow(/delay/i);
    expect(() => runSyntheticScenario(profile, { ...baseScenario, proposedOpeningMonths: 31 })).toThrow(/opening/i);
  });
});
