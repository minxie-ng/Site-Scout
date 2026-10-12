import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { factorCards } from "../prototype/factor-readiness.mjs";

const feed = JSON.parse(readFileSync(resolve(process.cwd(), "prototype/data.json"), "utf8"));

describe("Gate 2 factor-readiness preview", () => {
  it("keeps each researched factor scoped and unable to imply a cluster recommendation", () => {
    expect(feed.decision).toBe("insufficient_evidence");
    expect(feed.factors.map((factor: { id: string }) => factor.id)).toEqual([
      "rent", "premises_use", "competitors", "access", "demographics", "future_housing",
    ]);
    for (const factor of feed.factors) {
      expect(factor.status).toBe("research_only");
      expect(factor.linkedClusterIds).toEqual([]);
      expect(factor.blocker.length).toBeGreaterThan(15);
      expect(factor.scope).toContain("Singapore");
      expect(factor.sourceUrl).toMatch(/^https:\/\//);
      expect(factor.retrievedOn).toMatch(/^2026-10-0[56]$/);
    }
    expect(feed.factors.find((factor: { id: string }) => factor.id === "rent").blocker).toMatch(/price date|listing date/i);
    expect(feed.factors.find((factor: { id: string }) => factor.id === "premises_use").blocker).toMatch(/exact unit/i);
    expect(feed.factors.find((factor: { id: string }) => factor.id === "future_housing").blocker).toMatch(/calendar completion/i);
  });

  it("rejects a promoted or cluster-linked factor and escapes external text", () => {
    expect(() => factorCards([{ ...feed.factors[0], status: "usable" }])).toThrow();
    expect(() => factorCards([{ ...feed.factors[0], linkedClusterIds: [feed.clusters[0].id] }])).toThrow();
    const html = factorCards([{ ...feed.factors[0], summary: "<script>alert(1)</script>" }]);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
