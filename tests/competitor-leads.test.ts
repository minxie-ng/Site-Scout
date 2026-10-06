import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCompetitorLeads } from "../src/domain/competitor-leads";

const fixture = () => JSON.parse(readFileSync(resolve(process.cwd(), "src/data/snapshots/2026-10-06/competitor-leads.json"), "utf8"));

describe("Gate 2 competitor research leads", () => {
  it("keeps eight sourced outlets at their observed geographic and service scope", () => {
    const parsed = parseCompetitorLeads(fixture());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.outlets).toHaveLength(8);
    expect(parsed.data.outlets.filter(outlet => outlet.geographicRole === "punggol_lead")).toHaveLength(2);
    expect(parsed.data.outlets.filter(outlet => outlet.geographicRole === "regional_comparator")).toHaveLength(6);
    expect(parsed.data.outlets.map(outlet => outlet.id)).toEqual([
      "am-pilates-punggol", "elevate-oasis", "root-rise-fernvale", "tirisula-kovan-1",
      "tirisula-kovan-2", "sg-pilates-kovan", "pilates-fitness-serangoon", "kove-hougang",
    ]);
    for (const outlet of parsed.data.outlets) {
      expect(outlet.evidenceStatus).toBe("research_only");
      expect(outlet.coordinate).toBeNull();
      expect(outlet.normalPrice).toBeNull();
      expect(outlet.priceEffectiveDate).toBeNull();
      expect(outlet.linkedClusterIds).toEqual([]);
      expect(outlet.source.url).toMatch(/^https:\/\//);
      expect(outlet.source.retrievedOn).toBe("2026-10-06");
    }
    expect(parsed.data.outlets.find(outlet => outlet.id === "kove-hougang")?.service).toBe("private_reformer");
    expect(parsed.data.outlets.find(outlet => outlet.id === "tirisula-kovan-2")?.service).toBe("hybrid_reformer");
  });

  it("rejects unsupported promotion, price, coordinate, or duplicate outlet", () => {
    const cases = [
      (value: any) => { value.outlets[0].evidenceStatus = "usable"; },
      (value: any) => { value.outlets[0].linkedClusterIds = ["punggol-point-cove-442a-442b-443a"]; },
      (value: any) => { value.outlets[0].normalPrice = 19; },
      (value: any) => { value.outlets[0].coordinate = [103.91, 1.41]; },
      (value: any) => { value.outlets[7].id = value.outlets[0].id; },
      (value: any) => { value.outlets[7].service = "group_reformer"; },
    ];
    for (const mutate of cases) {
      const value = fixture();
      mutate(value);
      expect(parseCompetitorLeads(value).success).toBe(false);
    }
  });

  it("rejects unreviewed supporting links and reassuring provenance caveats", () => {
    const cases = [
      (value: any) => { value.outlets[0].source.supportingUrls.push("https://example.com/unreviewed"); },
      (value: any) => { value.outlets[0].source.supportingUrls[0] = "http://www.punggoldigitaldistrict.sg/shop/stores/am%20Pilates"; },
      (value: any) => { value.outlets[0].source.accessNote = "Stable unrestricted live access is confirmed."; },
      (value: any) => { value.outlets[0].source.rightsNote = "All marketing material is licensed for unrestricted reuse."; },
      (value: any) => { value.outlets[0].limitation = "No material limitation remains for a decision."; },
    ];
    for (const mutate of cases) {
      const value = fixture();
      mutate(value);
      expect(parseCompetitorLeads(value).success).toBe(false);
    }
  });
});
