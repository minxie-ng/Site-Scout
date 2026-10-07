import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildReviewedInvestigationShortlist } from "../src/engine/shortlist";

const read = (path: string) => JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
const base = "src/data/snapshots/2026-10-06/";
const reviewedInput = () => ({
  clusters: ["block-cluster.json", "punggol-sapphire-cluster.json", "punggol-ripples-cluster.json"].map(name => read(base + name)),
  competitorLeads: read(base + "competitor-leads.json"),
  development: read("src/data/snapshots/2026-10-05/developments.json"),
  factorFeed: read("prototype/data.json"),
});

describe("Gate 3 reviewed investigation shortlist", () => {
  it("shows all exact block groups but no preferred real site", () => {
    const result = buildReviewedInvestigationShortlist(reviewedInput());
    expect(result).toMatchObject({
      outcome: "insufficient_evidence",
      basis: "reviewed_gate2_snapshot",
      selectionStatus: "not_ranked",
      selectedCandidateId: null,
      nextInvestigation: "find_current_exact_premises",
    });
    expect(result.candidates.map(candidate => candidate.blockIds)).toEqual([
      ["442A", "442B", "443A"], ["267A", "267B", "267C"], ["211A", "211B", "211C"],
    ]);
    expect(result.candidates.every(candidate => candidate.outcome === "insufficient_evidence" && candidate.priorityRank === null)).toBe(true);
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

  it("rejects tampered source coordinates instead of returning even an abstaining shortlist", () => {
    const input = reviewedInput();
    input.clusters[0].members[0].latitude += 0.01;
    expect(() => buildReviewedInvestigationShortlist(input)).toThrow(/evidence validation|source|coordinate/i);
  });
});
