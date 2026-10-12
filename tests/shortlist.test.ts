import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assessAreaPrioritySensitivity, buildReviewedInvestigationShortlist, chooseAreaResearchPriority, chooseEligibleResearchLead, compareHypotheticalAreaResearchOrder } from "../src/engine/shortlist";
import { assessHypotheticalAreaRange } from "../src/engine/area-range";

const read = (path: string) => JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
const base = "src/data/snapshots/2026-10-06/";
const reviewedInput = () => ({
  clusters: ["block-cluster.json", "punggol-sapphire-cluster.json", "punggol-ripples-cluster.json"].map(name => read(base + name)),
  competitorLeads: read(base + "competitor-leads.json"),
  development: read("src/data/snapshots/2026-10-05/developments.json"),
  factorFeed: read("prototype/data.json"),
});

describe("Gate 3 reviewed investigation shortlist", () => {
  it("prioritizes one few-block area to investigate without approving a real site", () => {
    const result = buildReviewedInvestigationShortlist(reviewedInput());
    expect(result).toMatchObject({
      outcome: "insufficient_evidence",
      basis: "reviewed_gate2_snapshot",
      selectionStatus: "investigate_first_area",
      selectedCandidateId: "punggol-point-cove-442a-442b-443a",
      nextInvestigation: "compare_access_and_competition",
      recommendationScope: "pre_intake_research_triage",
    });
    expect(result.candidates.map(candidate => candidate.blockIds)).toEqual([
      ["442A", "442B", "443A"], ["267A", "267B", "267C"], ["211A", "211B", "211C"],
    ]);
    expect(result.candidates.every(candidate => candidate.outcome === "insufficient_evidence")).toBe(true);
    expect(result.candidates.map(candidate => candidate.priorityRank)).toEqual([1, null, null]);
    expect(result.areaPriority).toMatchObject({
      basis: "highest_published_dwelling_units_among_sampled_blocks",
      units: 511,
      evidenceKind: "observed_housing_stock_proxy",
      applicability: "business_agnostic_not_personalized",
      limitation: expect.stringMatching(/not.*demand|not.*best/i),
    });
    if (!result.areaPriority) throw new Error("Expected an area research priority");
    expect(result.areaPriority.hdbSources).toHaveLength(3);
    expect(result.areaPriority.hdbSources.every(source => source.snapshotSha256 && source.url && source.retrievedAt && source.geographicScope)).toBe(true);
  });

  it("names the decision-critical premises and local-market gaps for every candidate", () => {
    const result = buildReviewedInvestigationShortlist(reviewedInput());
    for (const candidate of result.candidates) {
      expect(candidate.missingEvidence).toEqual(expect.arrayContaining([
        "current_exact_unit_availability", "all_in_rent", "usable_floor_area", "permitted_pilates_use", "walking_access",
        "local_competitor_catchment", "owner_confirmed_inputs",
      ]));
      expect(candidate.missingEvidence).toContain("verified_future_timing");
    }
    if (!result.areaPriority) throw new Error("Expected an area research priority");
    expect(result.areaPriority.unresolvedComparisons).toEqual(expect.arrayContaining([
      "walking_access", "local_competitor_catchment", "owner_confirmed_inputs", "verified_future_timing",
    ]));
    expect(result.areaPriority.leaseChecks).toEqual(expect.arrayContaining([
      "current_exact_unit_availability", "all_in_rent", "permitted_pilates_use",
    ]));
  });

  it("retains a dated sourced block point as the representative anchor for each group", () => {
    const result = buildReviewedInvestigationShortlist(reviewedInput());
    for (const candidate of result.candidates) {
      expect(candidate.anchor).toMatchObject({
        basis: "representative_block_address_point",
        blockId: candidate.blockIds[0],
        oneMapSource: { evidenceStatus: "dated_replay", url: expect.stringMatching(/^https:\/\//), retrievedAt: expect.any(String), geographicScope: expect.any(String), snapshotSha256: expect.stringMatching(/^[a-f0-9]{64}$/) },
        hdbSource: { evidenceStatus: "dated_replay", url: expect.stringMatching(/^https:\/\//), retrievedAt: expect.any(String), geographicScope: expect.any(String), snapshotSha256: expect.stringMatching(/^[a-f0-9]{64}$/) },
      });
      expect(candidate.anchor.coordinates).toHaveLength(2);
      expect(candidate.anchor.limitation).toMatch(/not.*premises|not.*catchment/i);
    }
  });

  it("flags the closest two candidate anchors without claiming independent market catchments", () => {
    const result = buildReviewedInvestigationShortlist(reviewedInput());
    expect(result.closestCandidatePair).toMatchObject({
      clusterIds: ["punggol-sapphire-267a-267b-267c", "punggol-ripples-211a-211b-211c"],
      roundedStraightLineMetres: 413,
      basis: "representative_block_address_points",
      marketCatchmentRelation: "not_established",
      nextCheck: "verify_shared_walking_catchment_before_independent_ranking",
      oneMapSources: [
        { url: expect.stringMatching(/^https:\/\//), retrievedAt: expect.any(String), geographicScope: expect.any(String), snapshotSha256: expect.stringMatching(/^[a-f0-9]{64}$/) },
        { url: expect.stringMatching(/^https:\/\//), retrievedAt: expect.any(String), geographicScope: expect.any(String), snapshotSha256: expect.stringMatching(/^[a-f0-9]{64}$/) },
      ],
    });
    expect(result.independentCustomerCatchmentsEstablished).toBe(false);
  });

  it("rejects tampered source coordinates instead of returning even an abstaining shortlist", () => {
    const input = reviewedInput();
    input.clusters[0].members[0].latitude += 0.01;
    expect(() => buildReviewedInvestigationShortlist(input)).toThrow(/evidence validation|source|coordinate/i);
  });

  it("does not invent a first area when the housing-stock proxy ties", () => {
    expect(chooseAreaResearchPriority([
      { id: "a", publishedDwellingUnits: 100 },
      { id: "b", publishedDwellingUnits: 100 },
    ])).toBeNull();
  });

  it("keeps access and competitor leads source-scoped and out of real area scoring", () => {
    const result = buildReviewedInvestigationShortlist(reviewedInput());
    expect(result.areaFactorCoverage).toEqual([
      { factor: "access", status: "research_only_unlinked", linkedClusterIds: [], sourceUrl: expect.stringMatching(/^https:\/\//), retrievedOn: "2026-10-06" },
      { factor: "competitors", status: "research_only_unlinked", linkedClusterIds: [], sourceUrl: expect.stringMatching(/^https:\/\//), retrievedOn: "2026-10-05" },
    ]);
    expect(result.candidates.map(candidate => candidate.priorityRank)).toEqual([1, null, null]);
    expect(result.areaFactorMatrix).toHaveLength(3);
    expect(result.areaFactorMatrix.map(row => row.clusterId)).toEqual(result.candidates.map(candidate => candidate.id));
    for (const row of result.areaFactorMatrix) {
      expect(row.factors).toEqual([
        { factor: "access", applicability: "unknown_for_cluster", evidenceStatus: "research_only", sourceUrl: expect.stringMatching(/^https:\/\//), retrievedOn: "2026-10-06", geographicScope: expect.stringMatching(/Punggol/i) },
        { factor: "competitors", applicability: "unknown_for_cluster", evidenceStatus: "research_only", sourceUrl: expect.stringMatching(/^https:\/\//), retrievedOn: "2026-10-05", geographicScope: expect.stringMatching(/Punggol/i) },
      ]);
    }
  });

  it("shows hypothetical factor advantages without claiming the housing-stock priority reversed", () => {
    const shortlist = buildReviewedInvestigationShortlist(reviewedInput());
    const factors = shortlist.candidates.map((candidate, index) => ({
      clusterId: candidate.id,
      evidenceKind: "synthetic_assumption" as const,
      assumedWalkingMinutes: [12, 5, 9][index]!,
      assumedNearbyCompetitors: [3, 1, 2][index]!,
    }));
    expect(assessAreaPrioritySensitivity(shortlist, factors)).toEqual({
      evidenceKind: "synthetic_assumption",
      status: "factor_tradeoff_in_scenario",
      alternativeAdvantageClusterIds: [shortlist.candidates[1]!.id, shortlist.candidates[2]!.id],
      rankingEffect: "not_determined",
      siteOutcome: "insufficient_evidence",
    });
  });

  it("rejects incomplete or unlabelled hypothetical factor comparisons", () => {
    const shortlist = buildReviewedInvestigationShortlist(reviewedInput());
    const factors = shortlist.candidates.map(candidate => ({
      clusterId: candidate.id,
      evidenceKind: "synthetic_assumption" as const,
      assumedWalkingMinutes: 5,
      assumedNearbyCompetitors: 1,
    }));
    expect(() => assessAreaPrioritySensitivity(shortlist, factors.slice(1))).toThrow(/complete|cluster/i);
    expect(() => assessAreaPrioritySensitivity(shortlist, [{ ...factors[0], evidenceKind: "observed" }, ...factors.slice(1)])).toThrow(/synthetic/i);
  });

  it("changes a hypothetical research lead under stated access and competition limits", () => {
    const shortlist = buildReviewedInvestigationShortlist(reviewedInput());
    expect(shortlist.candidates.map(candidate => candidate.publishedDwellingUnits)).toEqual([511, 236, 360]);
    expect(shortlist.candidates.every(candidate => candidate.hdbSources.length === 3)).toBe(true);
    const factors = shortlist.candidates.map((candidate, index) => ({
      clusterId: candidate.id,
      evidenceKind: "synthetic_assumption" as const,
      assumedWalkingMinutes: [15, 9, 8][index]!,
      assumedNearbyCompetitors: [3, 1, 1][index]!,
    }));
    const result = compareHypotheticalAreaResearchOrder(reviewedInput(), {
      evidenceKind: "synthetic_assumption", factors,
      maxAssumedWalkingMinutes: 10, maxAssumedNearbyCompetitors: 2,
    });
    expect(result).toMatchObject({
      evidenceKind: "synthetic_assumption",
      policy: "thresholds_then_highest_published_housing_stock",
      eligibleClusterIds: [shortlist.candidates[1]!.id, shortlist.candidates[2]!.id],
      selectedClusterId: shortlist.candidates[2]!.id,
      selectionStatus: "hypothetical_research_lead",
      siteOutcome: "insufficient_evidence",
      assumptionLimits: { maxAssumedWalkingMinutes: 10, maxAssumedNearbyCompetitors: 2 },
      candidateTrace: [
        { clusterId: shortlist.candidates[0]!.id, assumedWalkingMinutes: 15, assumedNearbyCompetitors: 3, publishedDwellingUnits: 511, qualifies: false },
        { clusterId: shortlist.candidates[1]!.id, assumedWalkingMinutes: 9, assumedNearbyCompetitors: 1, publishedDwellingUnits: 236, qualifies: true },
        { clusterId: shortlist.candidates[2]!.id, assumedWalkingMinutes: 8, assumedNearbyCompetitors: 1, publishedDwellingUnits: 360, qualifies: true },
      ],
    });
    expect(result.candidateTrace.every(row => row.hdbSources.length === 3 && row.hdbSources.every(source => source.url && source.retrievedAt && source.geographicScope && source.snapshotSha256))).toBe(true);
    expect(compareHypotheticalAreaResearchOrder(reviewedInput(), {
      evidenceKind: "synthetic_assumption", factors,
      maxAssumedWalkingMinutes: 4, maxAssumedNearbyCompetitors: 0,
    })).toMatchObject({
      eligibleClusterIds: [], selectedClusterId: null,
      selectionStatus: "no_unique_hypothetical_lead", siteOutcome: "insufficient_evidence",
    });
    expect(shortlist.selectedCandidateId).toBe(shortlist.candidates[0]!.id);
  });

  it("abstains on tied eligible housing totals and rejects an unlabelled scenario", () => {
    expect(chooseEligibleResearchLead([
      { id: "a", publishedDwellingUnits: 100 },
      { id: "b", publishedDwellingUnits: 100 },
    ], ["a", "b"])).toBeNull();
    const shortlist = buildReviewedInvestigationShortlist(reviewedInput());
    const factors = shortlist.candidates.map(candidate => ({
      clusterId: candidate.id, evidenceKind: "synthetic_assumption" as const,
      assumedWalkingMinutes: 5, assumedNearbyCompetitors: 1,
    }));
    expect(() => compareHypotheticalAreaResearchOrder(reviewedInput(), {
      evidenceKind: "observed", factors,
      maxAssumedWalkingMinutes: 10, maxAssumedNearbyCompetitors: 2,
    })).toThrow(/synthetic/i);
    const tampered = reviewedInput();
    tampered.clusters[0].members[0].hdbResidentialEvidence.totalDwellingUnits += 1000;
    expect(() => compareHypotheticalAreaResearchOrder(tampered, {
      evidenceKind: "synthetic_assumption", factors,
      maxAssumedWalkingMinutes: 10, maxAssumedNearbyCompetitors: 2,
    })).toThrow(/evidence validation|source|dwelling/i);
  });

  it("rejects ambiguous helper identities rather than selecting a duplicate cluster", () => {
    const duplicate = [
      { id: "a", publishedDwellingUnits: 1 },
      { id: "a", publishedDwellingUnits: 2 },
    ];
    expect(chooseAreaResearchPriority(duplicate)).toBeNull();
    expect(chooseEligibleResearchLead(duplicate, ["a"])).toBeNull();
    expect(chooseAreaResearchPriority([{ id: " ", publishedDwellingUnits: 1 }])).toBeNull();
  });

  it("reports a stable hypothetical lead across bounded endpoint assumptions", () => {
    const ids = buildReviewedInvestigationShortlist(reviewedInput()).candidates.map(candidate => candidate.id);
    const ranges = ids.map((clusterId, index) => ({
      clusterId, evidenceKind: "synthetic_assumption",
      assumedWalkingMinutes: { min: [5, 8, 8][index]!, max: [7, 9, 9][index]! },
      assumedNearbyCompetitors: { min: 1, max: 2 },
    }));
    const result = assessHypotheticalAreaRange(reviewedInput(), {
      evidenceKind: "synthetic_assumption", factors: ranges,
      maxAssumedWalkingMinutes: { min: 10, max: 11 },
      maxAssumedNearbyCompetitors: { min: 2, max: 3 },
    });
    expect(result).toMatchObject({
      evidenceKind: "synthetic_assumption", status: "stable_hypothetical_lead",
      possibleLeadIds: [ids[0]], includesNoLead: false, siteOutcome: "insufficient_evidence",
    });
    expect(result.scenarioCount).toBeGreaterThan(1);
    expect(result.scenarioCount).toBeLessThanOrEqual(256);
    expect(result.witnesses[0]).toMatchObject({ selectedClusterId: ids[0], assumptions: { maxAssumedWalkingMinutes: expect.any(Number), maxAssumedNearbyCompetitors: expect.any(Number) } });
  });

  it("distinguishes a changed lead from a range containing no qualifying area", () => {
    const ids = buildReviewedInvestigationShortlist(reviewedInput()).candidates.map(candidate => candidate.id);
    const factors = ids.map((clusterId, index) => ({
      clusterId, evidenceKind: "synthetic_assumption",
      assumedWalkingMinutes: { min: [5, 7, 8][index]!, max: [15, 7, 8][index]! },
      assumedNearbyCompetitors: { min: 1, max: 1 },
    }));
    expect(assessHypotheticalAreaRange(reviewedInput(), {
      evidenceKind: "synthetic_assumption", factors,
      maxAssumedWalkingMinutes: { min: 10, max: 20 },
      maxAssumedNearbyCompetitors: { min: 2, max: 2 },
    })).toMatchObject({ status: "lead_changes_across_range", possibleLeadIds: [ids[0], ids[2]], includesNoLead: false });
    expect(assessHypotheticalAreaRange(reviewedInput(), {
      evidenceKind: "synthetic_assumption", factors,
      maxAssumedWalkingMinutes: { min: 4, max: 10 },
      maxAssumedNearbyCompetitors: { min: 2, max: 2 },
    })).toMatchObject({ status: "no_unique_lead_across_range", includesNoLead: true });
  });

  it("rejects invalid ranges and tampered source counts before range analysis", () => {
    const ids = buildReviewedInvestigationShortlist(reviewedInput()).candidates.map(candidate => candidate.id);
    const factors = ids.map(clusterId => ({
      clusterId, evidenceKind: "synthetic_assumption",
      assumedWalkingMinutes: { min: 5, max: 10 }, assumedNearbyCompetitors: { min: 1, max: 2 },
    }));
    const scenario = { evidenceKind: "synthetic_assumption", factors,
      maxAssumedWalkingMinutes: { min: 10, max: 5 }, maxAssumedNearbyCompetitors: { min: 2, max: 2 } };
    expect(() => assessHypotheticalAreaRange(reviewedInput(), scenario)).toThrow(/range|minimum|maximum/i);
    const tampered = reviewedInput();
    tampered.clusters[0].members[0].hdbResidentialEvidence.totalDwellingUnits += 1000;
    expect(() => assessHypotheticalAreaRange(tampered, {
      ...scenario, maxAssumedWalkingMinutes: { min: 5, max: 10 },
    })).toThrow(/evidence validation|source|dwelling/i);
  });
});
