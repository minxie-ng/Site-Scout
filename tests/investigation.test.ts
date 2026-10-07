import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBusinessProfile } from "../src/domain/business";
import { selectNextInvestigation, selectReviewedNextInvestigation } from "../src/engine/investigation";

const read = (path: string) => JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
const parsed = parseBusinessProfile(read("src/data/demo/business-profile.json"));
if (!parsed.success) throw new Error("Synthetic profile is invalid");
const profile = parsed.data;
const base = {
  monthlyRentSgd: 13_000,
  paidVisitUtilisation: 0.7,
  projectedDevelopmentCompletionMonths: 20,
  developmentDelayMonths: 0,
  proposedOpeningMonths: 24,
  developmentProvenance: "synthetic_assumption" as const,
  openingInvestmentSgd: 200_000,
  availableRunwayMonths: 9,
  premisesUseAssumption: "assumed_permitted" as const,
};
const ranges = [
  { input: "monthlyRentSgd" as const, low: 10_000, high: 30_000, investigation: "obtain_current_exact_unit_rent_quote" as const },
  { input: "paidVisitUtilisation" as const, low: 0.6, high: 0.75, investigation: "validate_local_paid_visit_demand" as const },
  { input: "developmentDelayMonths" as const, low: 0, high: 6, investigation: "verify_development_timing" as const },
];
const snapshotBase = "src/data/snapshots/2026-10-06/";
const reviewedInput = () => ({
  clusters: ["block-cluster.json", "punggol-sapphire-cluster.json", "punggol-ripples-cluster.json"].map(name => read(snapshotBase + name)),
  competitorLeads: read(snapshotBase + "competitor-leads.json"),
  development: read("src/data/snapshots/2026-10-05/developments.json"),
  factorFeed: read("prototype/data.json"),
});

describe("Gate 3 next-investigation sensitivity", () => {
  it("reruns one bounded synthetic input at a time and selects the first largest outcome-changing range", () => {
    const result = selectNextInvestigation(profile, base, ranges);
    expect(result).toMatchObject({
      basis: "synthetic_fixture_only",
      baselineOutcome: "investigate",
      selectedInput: "monthlyRentSgd",
      nextInvestigation: "obtain_current_exact_unit_rent_quote",
      selectedCandidateId: null,
    });
    expect(result.sensitivities).toHaveLength(3);
    expect(result.sensitivities[0]).toMatchObject({
      input: "monthlyRentSgd", low: 10_000, high: 30_000,
      lowOutcome: "investigate", highOutcome: "wait", changesOutcome: true,
    });
    expect(result.sensitivities[1]).toMatchObject({ input: "paidVisitUtilisation", lowOutcome: "wait", highOutcome: "investigate", changesOutcome: true });
    expect(result.sensitivities[2]).toMatchObject({ input: "developmentDelayMonths", lowOutcome: "investigate", highOutcome: "wait", changesOutcome: true });
    expect(result.sensitivities.every(item => item.basis === "synthetic_fixture_only")).toBe(true);
  });

  it("reports no outcome-changing range when both endpoints match the baseline", () => {
    const result = selectNextInvestigation(profile, base, [
      { input: "monthlyRentSgd", low: 12_000, high: 13_000, investigation: "obtain_current_exact_unit_rent_quote" },
    ]);
    expect(result).toMatchObject({ selectedInput: null, nextInvestigation: null, baselineOutcome: "investigate" });
    expect(result.sensitivities[0]).toMatchObject({ changesOutcome: false });
  });

  it("keeps three reviewed clusters abstaining while naming only a hypothetical investigation proxy", () => {
    const result = selectReviewedNextInvestigation(reviewedInput(), profile, base, ranges);
    expect(result).toMatchObject({
      outcome: "insufficient_evidence",
      basis: "reviewed_gate2_snapshot",
      selectedCandidateId: null,
      nextInvestigation: "obtain_current_exact_unit_rent_quote",
      investigationBasis: "synthetic_sensitivity_proxy",
    });
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates.every(candidate => candidate.outcome === "insufficient_evidence")).toBe(true);
    expect(result.unmodelledEvidenceGaps).toEqual([
      "premises_use_and_availability", "local_competitor_catchments", "walking_access", "owner_confirmed_inputs",
    ]);
  });

  it("selects a source-evidence investigation when synthetic ranges do not change an outcome", () => {
    const result = selectReviewedNextInvestigation(reviewedInput(), profile, base, [
      { input: "monthlyRentSgd", low: 12_000, high: 13_000, investigation: "obtain_current_exact_unit_rent_quote" },
    ]);
    expect(result).toMatchObject({
      outcome: "insufficient_evidence",
      selectedCandidateId: null,
      nextInvestigation: "verify_exact_premises_use_and_availability",
      investigationBasis: "reviewed_evidence_gap_fallback",
    });
  });

  it("rejects invalid ranges, duplicates, and unsupported provenance rather than manufacturing sensitivity", () => {
    expect(() => selectNextInvestigation(profile, base, [{ ...ranges[0], low: 31_000 }])).toThrow(/range/i);
    expect(() => selectNextInvestigation(profile, base, [ranges[0], ranges[0]])).toThrow(/duplicate/i);
    expect(() => selectNextInvestigation(profile, base, [{ ...ranges[1], high: 1.1 }])).toThrow(/utilisation|range/i);
    expect(() => selectNextInvestigation(profile, base, [{ ...ranges[0], low: 14_000 }])).toThrow(/baseline|range/i);
    expect(() => selectNextInvestigation(profile, { ...base, developmentProvenance: "observed" as never }, ranges)).toThrow(/synthetic/i);
  });

  it("revalidates reviewed source integrity before selecting an investigation", () => {
    const input = reviewedInput();
    input.clusters[0].members[0].latitude += 0.01;
    expect(() => selectReviewedNextInvestigation(input, profile, base, ranges)).toThrow(/evidence validation|source|coordinate/i);
  });
});
