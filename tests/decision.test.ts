import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBusinessProfile } from "../src/domain/business";
import { decideHypotheticalPortfolio, decideHypotheticalScenario, decideReviewedCluster, decideReviewedPortfolio } from "../src/engine/decision";

const read = (path: string) => JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
const parsed = parseBusinessProfile(read("src/data/demo/business-profile.json"));
if (!parsed.success) throw new Error("Approved synthetic profile is invalid");
const profile = parsed.data;
const snapshotBase = "src/data/snapshots/2026-10-06/";
const reviewedInput = () => ({
  clusters: ["block-cluster.json", "punggol-sapphire-cluster.json", "punggol-ripples-cluster.json"].map(name => read(snapshotBase + name)),
  competitorLeads: read(snapshotBase + "competitor-leads.json"),
  development: read("src/data/snapshots/2026-10-05/developments.json"),
  factorFeed: read("prototype/data.json"),
});

describe("Gate 3 portfolio hard constraints", () => {
  it("preserves three source-validated abstentions and selects no real winner", () => {
    const result = decideReviewedPortfolio(reviewedInput());
    expect(result).toMatchObject({ outcome: "insufficient_evidence", basis: "reviewed_gate2_snapshot", selectedCandidateId: null });
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates.every(candidate => candidate.outcome === "insufficient_evidence")).toBe(true);
  });

  it("returns no_go only when all three synthetic candidates fail hard economics", () => {
    const infeasibleProfile = structuredClone(profile);
    infeasibleProfile.economics.monthlyRent.low = 30_000;
    infeasibleProfile.economics.monthlyRent.base = 31_000;
    infeasibleProfile.economics.monthlyRent.high = 32_000;
    const candidates = [30_000, 31_000, 32_000].map((monthlyRentSgd, index) => ({
      id: `synthetic-${index + 1}`,
      scenario: { ...syntheticScenario, monthlyRentSgd },
    }));
    expect(decideHypotheticalPortfolio(infeasibleProfile, candidates)).toMatchObject({
      outcome: "no_go", basis: "synthetic_fixture_only", selectedCandidateId: null,
      candidates: [{ outcome: "no_go" }, { outcome: "no_go" }, { outcome: "no_go" }],
    });
  });

  it("does not manufacture a winner from mixed hypothetical results", () => {
    const candidates = [
      { id: "synthetic-a", scenario: { ...syntheticScenario, openingInvestmentSgd: 300_000 } },
      { id: "synthetic-b", scenario: { ...syntheticScenario, availableRunwayMonths: 8 } },
      { id: "synthetic-c", scenario: { ...syntheticScenario, developmentDelayMonths: 6 } },
    ];
    expect(decideHypotheticalPortfolio(profile, candidates)).toMatchObject({
      outcome: "insufficient_evidence", basis: "synthetic_fixture_only", selectedCandidateId: null,
    });
  });

  it("rejects duplicate synthetic candidate IDs and tampered reviewed sources", () => {
    const candidates = [1, 2, 3].map(() => ({ id: "synthetic-a", scenario: syntheticScenario }));
    expect(() => decideHypotheticalPortfolio(profile, candidates)).toThrow(/unique|duplicate/i);
    const input = reviewedInput();
    input.clusters[0].members[0].latitude += 0.01;
    expect(() => decideReviewedPortfolio(input)).toThrow(/evidence validation|source|coordinate/i);
  });

  it("rejects sparse candidate arrays", () => {
    const sparse = new Array(3) as Array<{ id: string; scenario: typeof syntheticScenario }>;
    sparse[0] = { id: "synthetic-a", scenario: syntheticScenario };
    sparse[2] = { id: "synthetic-c", scenario: syntheticScenario };
    expect(() => decideHypotheticalPortfolio(profile, sparse)).toThrow(/three actual candidates|missing candidate/i);
  });

  it("rejects ambiguous whitespace-padded IDs", () => {
    const padded = [
      { id: "synthetic-a", scenario: syntheticScenario },
      { id: " synthetic-a", scenario: syntheticScenario },
      { id: "synthetic-c", scenario: syntheticScenario },
    ];
    expect(() => decideHypotheticalPortfolio(profile, padded)).toThrow(/whitespace|unique/i);
  });
});
const syntheticScenario = {
  monthlyRentSgd: 13_000,
  paidVisitUtilisation: 0.7,
  projectedDevelopmentCompletionMonths: 20,
  developmentDelayMonths: 0,
  proposedOpeningMonths: 24,
  developmentProvenance: "synthetic_assumption" as const,
  occupancyLagMonths: 0,
  occupancyProvenance: "synthetic_assumption" as const,
  openingInvestmentSgd: 200_000,
  availableRunwayMonths: 9,
  premisesUseAssumption: "assumed_permitted" as const,
};

describe("Gate 3 evidence-gated decision outcomes", () => {
  it("keeps all three reviewed Punggol clusters at insufficient evidence despite positive synthetic economics", () => {
    const input = reviewedInput();
    for (const cluster of input.clusters) {
      expect(decideReviewedCluster(input, cluster.id)).toMatchObject({
        clusterId: cluster.id,
        outcome: "insufficient_evidence",
        basis: "reviewed_gate2_snapshot",
      });
    }
  });

  it("rejects a tampered source before issuing even an abstention", () => {
    const input = reviewedInput();
    input.clusters[0].members[0].latitude += 0.01;
    expect(() => decideReviewedCluster(input, input.clusters[0].id)).toThrow(/evidence validation|source|coordinate/i);
  });

  it("changes only a labelled hypothetical outcome under adverse rent, utilisation, and delay", () => {
    expect(decideHypotheticalScenario(profile, syntheticScenario)).toMatchObject({ outcome: "investigate", basis: "synthetic_fixture_only" });
    expect(decideHypotheticalScenario(profile, { ...syntheticScenario, monthlyRentSgd: 30_000 })).toMatchObject({ outcome: "wait", basis: "synthetic_fixture_only", reasonCode: "rent_terms_need_improvement", reviewCondition: "Obtain a lower rent assumption or quote", reviewMonthsFromAnalysis: 1 });
    expect(decideHypotheticalScenario(profile, { ...syntheticScenario, paidVisitUtilisation: 0.6 })).toMatchObject({ outcome: "wait", basis: "synthetic_fixture_only", reasonCode: "paid_visits_need_validation", reviewCondition: "Validate a paid-visit level that covers costs", reviewMonthsFromAnalysis: 1 });
    expect(decideHypotheticalScenario(profile, { ...syntheticScenario, developmentDelayMonths: 6 })).toMatchObject({ outcome: "wait", basis: "synthetic_fixture_only", reasonCode: "synthetic_completion_after_opening", reviewCondition: "Recheck the synthetic development completion assumption", reviewMonthsFromAnalysis: 26 });
  });

  it("waits when synthetic occupancy follows opening despite project completion by opening", () => {
    expect(decideHypotheticalScenario(profile, { ...syntheticScenario, occupancyLagMonths: 6 })).toMatchObject({
      outcome: "wait",
      basis: "synthetic_fixture_only",
      reasonCode: "synthetic_occupancy_after_opening",
      reviewCondition: "Recheck the synthetic occupancy timing assumption",
      reviewMonthsFromAnalysis: 26,
    });
    expect(decideHypotheticalScenario(profile, syntheticScenario).outcome).toBe("investigate");
    expect(decideReviewedPortfolio(reviewedInput())).toMatchObject({ outcome: "insufficient_evidence", selectedCandidateId: null });
  });

  it("does not set a housing review month before both delayed completion and occupancy", () => {
    expect(decideHypotheticalScenario(profile, {
      ...syntheticScenario, developmentDelayMonths: 6, occupancyLagMonths: 6,
    })).toMatchObject({
      outcome: "wait",
      reasonCode: "synthetic_completion_after_opening",
      reviewCondition: "Recheck synthetic completion and occupancy timing assumptions",
      reviewMonthsFromAnalysis: 32,
    });
  });

  it("does not call a base-rent threshold breach no_go when low rent can still pass the stress policy", () => {
    expect(decideHypotheticalScenario(profile, { ...syntheticScenario, monthlyRentSgd: 17_000 })).toMatchObject({ outcome: "wait", reasonCode: "rent_terms_need_improvement" });
  });

  it("returns no_go when every synthetic candidate fails even at the most favourable rent", () => {
    const infeasibleProfile = structuredClone(profile);
    infeasibleProfile.economics.monthlyRent.low = 30_000;
    infeasibleProfile.economics.monthlyRent.base = 31_000;
    infeasibleProfile.economics.monthlyRent.high = 32_000;
    const candidates = [30_000, 31_000, 32_000].map(monthlyRentSgd =>
      decideHypotheticalScenario(infeasibleProfile, { ...syntheticScenario, monthlyRentSgd }));
    expect(candidates.map(candidate => candidate.outcome)).toEqual(["no_go", "no_go", "no_go"]);
    expect(candidates.every(candidate => candidate.reasonCode === "lowest_rent_economics_fail")).toBe(true);
  });

  it("checks capital, runway, and assumed premises permission before a hypothetical investigate outcome", () => {
    expect(decideHypotheticalScenario(profile, { ...syntheticScenario, openingInvestmentSgd: 250_001 })).toMatchObject({ outcome: "no_go", reasonCode: "opening_investment_exceeds_cap" });
    expect(decideHypotheticalScenario(profile, { ...syntheticScenario, availableRunwayMonths: 8 })).toMatchObject({ outcome: "no_go", reasonCode: "runway_below_minimum" });
    expect(decideHypotheticalScenario(profile, { ...syntheticScenario, premisesUseAssumption: "assumed_not_permitted" })).toMatchObject({ outcome: "no_go", reasonCode: "premises_use_assumed_not_permitted" });
  });
});
