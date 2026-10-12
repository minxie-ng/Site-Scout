import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { parseBlockCluster } from "../src/domain/block-cluster";

function fixture(): any {
  return JSON.parse(readFileSync(resolve(process.cwd(), "src/data/snapshots/2026-10-06/block-cluster.json"), "utf8"));
}

describe("one reviewed HDB block-location cluster", () => {
  it("accepts only the three source-backed block points as a candidate cluster", () => {
    const result = parseBlockCluster(fixture());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.evidenceStatus).toBe("candidate_cluster");
    expect(result.data.members.map(member => member.blockId)).toEqual(["442A", "442B", "443A"]);
    expect(result.data.selection.provenance).toBe("derived_value");
    expect(result.data.selection.sourceIds).toEqual(result.data.members.map(member => member.sourceId));
    expect(result.data.members.map(member => member.hdbResidentialEvidence?.yearCompleted)).toEqual([2025, 2024, 2024]);
    expect(result.data.members.every(member => member.hdbResidentialEvidence?.residential === "Y")).toBe(true);
    expect(result.data.linkedDevelopmentIds).toEqual([]);
    expect(result.data.linkedCompetitorIds).toEqual([]);
  });

  it("rejects a missing member block", () => {
    const record = fixture();
    record.members.pop();
    expect(parseBlockCluster(record).success).toBe(false);
  });

  it("rejects a missing coordinate or a changed in-range coordinate", () => {
    const missing = fixture();
    delete missing.members[1].latitude;
    expect(parseBlockCluster(missing).success).toBe(false);

    const changed = fixture();
    changed.members[1].latitude = 1.42;
    expect(parseBlockCluster(changed).success).toBe(false);
  });

  it("rejects an unsupported development or competitor join", () => {
    const development = fixture();
    development.linkedDevelopmentIds.push("hdb-punggol-point-cove-phase-2-completion-2025-01");
    expect(parseBlockCluster(development).success).toBe(false);

    const competitor = fixture();
    competitor.linkedCompetitorIds.push("am-pilates-punggol");
    expect(parseBlockCluster(competitor).success).toBe(false);
  });

  it("rejects a changed source hash, missing file, or escaped path", () => {
    const badHash = fixture();
    badHash.sources[1].snapshotSha256 = "0".repeat(64);
    expect(parseBlockCluster(badHash).success).toBe(false);

    const missing = fixture();
    missing.sources[1].snapshotPath = "src/data/snapshots/2026-10-06/original/missing.json";
    expect(parseBlockCluster(missing).success).toBe(false);

    const escaped = fixture();
    escaped.sources[1].snapshotPath = "/tmp/site-scout-block-1.json";
    expect(parseBlockCluster(escaped).success).toBe(false);
  });

  it("rejects duplicate block identities or a claim of proved Phase 2 membership", () => {
    const duplicate = fixture();
    duplicate.members[1].blockId = "442A";
    expect(parseBlockCluster(duplicate).success).toBe(false);

    const phaseJoin = fixture();
    phaseJoin.selection.limitation = "All three blocks are confirmed to be Phase 2.";
    expect(parseBlockCluster(phaseJoin).success).toBe(false);
  });

  it("rejects a derived selection that omits a block-point source", () => {
    const record = fixture();
    record.selection.sourceIds = ["onemap-821442", "onemap-442b-new-punggol-road"];
    expect(parseBlockCluster(record).success).toBe(false);
  });

  it("requires HDB evidence for the exact block-and-street identity", () => {
    const wrongStreet = fixture();
    wrongStreet.members[0].hdbResidentialEvidence.street = "BT BATOK WEST AVE 8";
    expect(parseBlockCluster(wrongStreet).success).toBe(false);

    const missing = fixture();
    delete missing.members[1].hdbResidentialEvidence;
    expect(parseBlockCluster(missing).success).toBe(false);
  });

  it("rejects a nonresidential HDB claim or altered HDB source digest", () => {
    const nonresidential = fixture();
    nonresidential.members[1].hdbResidentialEvidence.residential = "N";
    expect(parseBlockCluster(nonresidential).success).toBe(false);

    const altered = fixture();
    altered.hdbSources[0].snapshotSha256 = "0".repeat(64);
    expect(parseBlockCluster(altered).success).toBe(false);
  });
});
