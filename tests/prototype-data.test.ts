import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBlockCluster } from "../src/domain/block-cluster";

const snapshotRoot = "src/data/snapshots/2026-10-06";
const files = ["block-cluster.json", "punggol-sapphire-cluster.json", "punggol-ripples-cluster.json"];

describe("offline prototype evidence feed", () => {
  it("shows every verified block point, with no recommendation or unsupported joins", () => {
    const feed = JSON.parse(readFileSync(resolve(process.cwd(), "prototype/data.json"), "utf8"));
    expect(feed.snapshotDate).toBe("2026-10-06");
    expect(feed.decision).toBe("insufficient_evidence");
    expect(feed.clusters).toHaveLength(3);
    for (const [index, file] of files.entries()) {
      const checked = parseBlockCluster(JSON.parse(readFileSync(resolve(process.cwd(), snapshotRoot, file), "utf8")));
      expect(checked.success).toBe(true);
      if (!checked.success) return;
      const shown = feed.clusters[index];
      expect(shown.id).toBe(checked.data.id);
      expect(shown.name).toBe(checked.data.name);
      expect(shown.blocks).toEqual(checked.data.members.map(member => ({
        id: member.blockId,
        latitude: member.latitude,
        longitude: member.longitude,
        units: member.hdbResidentialEvidence.totalDwellingUnits,
        completed: member.hdbResidentialEvidence.yearCompleted,
        postal: member.postalCode,
        oneMapUrl: checked.data.sources.find(source => source.id === member.sourceId)?.sourceUrl,
        oneMapRetrievedAt: checked.data.sources.find(source => source.id === member.sourceId)?.retrievedAt,
        hdbUrl: checked.data.hdbSources.find(source => source.id === member.hdbResidentialEvidence.sourceId)?.sourceUrl,
        hdbRetrievedAt: checked.data.hdbSources.find(source => source.id === member.hdbResidentialEvidence.sourceId)?.retrievedAt,
      })));
      expect(shown.linkedDevelopmentIds).toEqual([]);
      expect(shown.linkedCompetitorIds).toEqual([]);
      expect(shown.evidenceStatus).toBe("candidate_cluster");
    }
    expect(feed.caveats).toContain("The second and third block groups are about 413 m apart and may share a customer catchment.");
  });
});
