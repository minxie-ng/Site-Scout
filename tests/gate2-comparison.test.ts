import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assembleGate2Comparison } from "../src/domain/gate2-comparison";

const read = (path: string) => JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
const base = "src/data/snapshots/2026-10-06/";
const input = () => ({
  clusters: ["block-cluster.json", "punggol-sapphire-cluster.json", "punggol-ripples-cluster.json"].map(name => read(base + name)),
  competitorLeads: read(base + "competitor-leads.json"),
  development: read("src/data/snapshots/2026-10-05/developments.json"),
  factorFeed: read("prototype/data.json"),
});

describe("Gate 2 offline three-cluster comparison", () => {
  it("compares reviewed blocks and explicitly abstains on missing decision links", () => {
    const comparison = assembleGate2Comparison(input());
    expect(comparison.snapshotDate).toBe("2026-10-06");
    expect(comparison.decision).toBe("insufficient_evidence");
    expect(comparison.clusters).toHaveLength(3);
    expect(comparison.evidencePoints).toHaveLength(9);
    expect(comparison.evidencePoints.every(point => point.properties.oneMapSource.snapshotSha256 && point.properties.hdbSource.snapshotSha256)).toBe(true);
    expect(comparison.clusters.map(cluster => cluster.blockIds)).toEqual([
      ["442A", "442B", "443A"], ["267A", "267B", "267C"], ["211A", "211B", "211C"],
    ]);
    expect(comparison.clusters.map(cluster => cluster.publishedDwellingUnits)).toEqual([511, 236, 360]);
    expect(comparison.clusters.every(cluster => cluster.decision === "insufficient_evidence")).toBe(true);
    expect(comparison.clusters.every(cluster => cluster.linkedCompetitorIds.length === 0 && cluster.linkedDevelopmentIds.length === 0)).toBe(true);
    expect(comparison.contextualDevelopment.status.effectiveDate).toBe("2025-01");
    expect(comparison.contextualDevelopment.spatialUse).toBe("not_established");
    expect(comparison.competitorCoverage).toEqual({ totalReviewedLeads: 8, punggolLeads: 2, linkedToClusters: 0, pricingUse: "not_established" });
    expect(comparison.factorStatus.map(factor => factor.id)).toEqual(["rent", "premises_use", "competitors", "access", "demographics", "future_housing"]);
    expect(comparison.factorStatus.every(factor => factor.status === "research_only" && factor.linkedClusterIds.length === 0)).toBe(true);
    expect(comparison.overlapWarning).toContain("413 m");
  });

  it("rejects a fabricated competitor, development, or factor cluster join", () => {
    const cases = [
      (value: ReturnType<typeof input>) => { value.competitorLeads.outlets[0].linkedClusterIds = [value.clusters[0].id]; },
      (value: ReturnType<typeof input>) => { value.clusters[0].linkedDevelopmentIds = [value.development.id]; },
      (value: ReturnType<typeof input>) => { value.factorFeed.factors[0].linkedClusterIds = [value.clusters[0].id]; },
    ];
    for (const mutate of cases) {
      const value = input();
      mutate(value);
      expect(() => assembleGate2Comparison(value)).toThrow();
    }
  });

  it("fails closed if an integrity-checked source is changed", () => {
    const value = input();
    value.clusters[0].members[0].latitude += 0.01;
    expect(() => assembleGate2Comparison(value)).toThrow();
  });

  it("does not echo a fabricated factor source as a reviewed lead", () => {
    const value = input();
    value.factorFeed.factors[0].sourceUrl = "https://example.com/fake-rent-source";
    expect(() => assembleGate2Comparison(value)).toThrow();
  });

  it("does not echo an invented factor retrieval date", () => {
    const value = input();
    value.factorFeed.factors[0].retrievedOn = "2030-01-01";
    expect(() => assembleGate2Comparison(value)).toThrow();
  });
});
