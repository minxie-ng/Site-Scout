import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBlockCluster } from "../src/domain/block-cluster";

function fixture(): any {
  return JSON.parse(readFileSync(resolve(process.cwd(), "src/data/snapshots/2026-10-06/punggol-ripples-cluster.json"), "utf8"));
}

describe("third reviewed HDB block cluster", () => {
  it("accepts only the three Punggol Ripples residential blocks", () => {
    const result = parseBlockCluster(fixture());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.members.map(member => member.blockId)).toEqual(["211A", "211B", "211C"]);
    expect(result.data.members.map(member => member.hdbResidentialEvidence.totalDwellingUnits)).toEqual([112, 129, 119]);
    expect(result.data.linkedDevelopmentIds).toEqual([]);
    expect(result.data.linkedCompetitorIds).toEqual([]);
  });

  it("rejects the 211A childcare result instead of the residential address", () => {
    const record = fixture();
    record.members[0].buildingName = "BUSY BEES";
    record.members[0].postalCode = "NIL";
    expect(parseBlockCluster(record).success).toBe(false);
  });

  it("rejects missing blocks, wrong street, altered source, and speculative joins", () => {
    const missing = fixture(); missing.members.pop();
    expect(parseBlockCluster(missing).success).toBe(false);
    const street = fixture(); street.members[0].hdbResidentialEvidence.street = "PUNGGOL FIELD";
    expect(parseBlockCluster(street).success).toBe(false);
    const digest = fixture(); digest.sources[0].snapshotSha256 = "0".repeat(64);
    expect(parseBlockCluster(digest).success).toBe(false);
    const join = fixture(); join.linkedDevelopmentIds.push("unproven");
    expect(parseBlockCluster(join).success).toBe(false);
  });
});
