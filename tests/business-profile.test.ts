import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseBusinessProfile } from "../src/domain/business";

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
}

describe("business profile validation", () => {
  it("accepts the approved synthetic profile", () => {
    const result = parseBusinessProfile(
      loadJson("src/data/demo/business-profile.json"),
    );

    expect(result.success).toBe(true);
  });

  it("reports every missing decision-critical input", () => {
    const result = parseBusinessProfile(
      loadJson("tests/fixtures/business-profile.invalid.json"),
    );

    expect(result.success).toBe(false);
    if (result.success) return;

    const paths = result.error.issues.map((issue) => issue.path.join("."));
    expect(paths).toEqual(
      expect.arrayContaining([
        "capacity.sellableSeatsPerClass",
        "capacity.scheduledClassesPerWeek",
        "economics.averageRealisedRevenuePerPaidVisit",
        "economics.variableCostPerPaidVisit",
        "economics.monthlyRent",
        "economics.openingInvestmentMaximum",
        "timing.earliestOpeningMonths",
        "timing.latestOpeningMonths"
      ]),
    );
  });

  it("rejects fractional capacity and a unit from the wrong field", () => {
    const profile = loadJson("src/data/demo/business-profile.json") as any;
    profile.capacity.sellableSeatsPerClass.value = 10.5;
    profile.capacity.sellableSeatsPerClass.unit = "SGD_per_month";

    const result = parseBusinessProfile(profile);

    expect(result.success).toBe(false);
  });

  it("rejects a relative investigation date", () => {
    const profile = loadJson("src/data/demo/business-profile.json") as any;
    profile.timing.investigationStart.value = "soon";

    const result = parseBusinessProfile(profile);

    expect(result.success).toBe(false);
  });

  it("rejects an impossible calendar date", () => {
    const profile = loadJson("src/data/demo/business-profile.json") as any;
    profile.timing.investigationStart.value = "2026-02-31";

    const result = parseBusinessProfile(profile);

    expect(result.success).toBe(false);
  });

  it("rejects a unit from the wrong field on monthly rent", () => {
    const profile = loadJson("src/data/demo/business-profile.json") as any;
    profile.economics.monthlyRent.unit = "seat_visits";

    const result = parseBusinessProfile(profile);

    expect(result.success).toBe(false);
  });

  it("rejects a base threshold above the stress threshold", () => {
    const profile = loadJson("src/data/demo/business-profile.json") as any;
    profile.decisionPolicy.maximumBaseBreakEvenUtilisation.value = 0.9;
    profile.decisionPolicy.maximumStressBreakEvenUtilisation.value = 0.8;

    const result = parseBusinessProfile(profile);

    expect(result.success).toBe(false);
  });

  it("rejects unknown fields instead of silently stripping them", () => {
    const profile = loadJson("src/data/demo/business-profile.json") as any;
    profile.economics.monthlyRent.typo = 123;

    const result = parseBusinessProfile(profile);

    expect(result.success).toBe(false);
  });
});
