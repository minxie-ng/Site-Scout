import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseBlockCluster } from "../src/domain/block-cluster";

function fixture(): any {
  return JSON.parse(readFileSync(resolve(process.cwd(), "src/data/snapshots/2026-10-06/punggol-sapphire-cluster.json"), "utf8"));
}

describe("second reviewed HDB block cluster", () => {
  it("accepts only the three Punggol Sapphire residential address points", () => {
    const result = parseBlockCluster(fixture());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.members.map(member => member.blockId)).toEqual(["267A", "267B", "267C"]);
    expect(result.data.members.map(member => member.hdbResidentialEvidence.totalDwellingUnits)).toEqual([89, 89, 58]);
    expect(result.data.linkedDevelopmentIds).toEqual([]);
    expect(result.data.linkedCompetitorIds).toEqual([]);
  });

  it("selects the 267A residential-building result, not its preschool point", () => {
    const record = fixture();
    record.members[0].postalCode = "NIL";
    record.members[0].buildingName = "MY FIRST SKOOL";
    record.members[0].latitude = 1.40455908718089;
    record.members[0].longitude = 103.8975048942387;
    expect(parseBlockCluster(record).success).toBe(false);
  });

  it("rejects a missing member, wrong HDB street, or nonresidential status", () => {
    const missing = fixture();
    missing.members.pop();
    expect(parseBlockCluster(missing).success).toBe(false);

    const street = fixture();
    street.members[0].hdbResidentialEvidence.street = "COMPASSVALE LINK";
    expect(parseBlockCluster(street).success).toBe(false);

    const status = fixture();
    status.members[0].hdbResidentialEvidence.residential = "N";
    expect(parseBlockCluster(status).success).toBe(false);
  });

  it("rejects changed point, missing citation, source digest, or speculative joins", () => {
    const point = fixture();
    point.members[1].longitude = 103.9;
    expect(parseBlockCluster(point).success).toBe(false);

    const citation = fixture();
    citation.selection.sourceIds.pop();
    expect(parseBlockCluster(citation).success).toBe(false);

    const digest = fixture();
    digest.hdbSources[2].snapshotSha256 = "0".repeat(64);
    expect(parseBlockCluster(digest).success).toBe(false);

    const join = fixture();
    join.linkedCompetitorIds.push("am-pilates-punggol");
    expect(parseBlockCluster(join).success).toBe(false);
  });
});
