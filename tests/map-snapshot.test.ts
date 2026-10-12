import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildReviewedMapSnapshot } from "../src/domain/map-snapshot";

const root = "src/data/snapshots/2026-10-06";
const files = ["block-cluster.json", "punggol-sapphire-cluster.json", "punggol-ripples-cluster.json"];
const originals = () => files.map(file => JSON.parse(readFileSync(resolve(process.cwd(), root, file), "utf8")));

describe("offline reviewed cluster map", () => {
  it("binds nine GeoJSON points to source identity, date, scope, and observed/derived status", () => {
    const map = buildReviewedMapSnapshot(originals());
    expect(map.type).toBe("FeatureCollection");
    expect(map.decision).toBe("insufficient_evidence");
    expect(map.features).toHaveLength(9);
    for (const [index, source] of originals().entries()) {
      for (const [blockIndex, member] of source.members.entries()) {
        const feature = map.features[index * 3 + blockIndex];
        const oneMap = source.sources.find((item: any) => item.id === member.sourceId);
        const hdb = source.hdbSources.find((item: any) => item.id === member.hdbResidentialEvidence.sourceId);
        expect(feature.geometry).toEqual({ type: "Point", coordinates: [member.longitude, member.latitude] });
        expect(feature.properties.blockId).toBe(member.blockId);
        expect(feature.properties.clusterId).toBe(source.id);
        expect(feature.properties.coordinateProvenance).toBe("observed_fact");
        expect(feature.properties.clusterProvenance).toBe("derived_value");
        expect(feature.properties.oneMapSource).toEqual({ id: oneMap.id, url: oneMap.sourceUrl, retrievedAt: oneMap.retrievedAt, publicationDate: oneMap.publicationDate, geographicScope: oneMap.geographicScope, accessStatus: oneMap.accessStatus, licenceAccessNote: oneMap.licenceAccessNote, snapshotPath: oneMap.snapshotPath, snapshotSha256: oneMap.snapshotSha256, evidenceStatus: "dated_replay" });
        expect(feature.properties.hdbSource).toEqual({ id: hdb.id, url: hdb.sourceUrl, retrievedAt: hdb.retrievedAt, publicationDate: hdb.publicationDate, geographicScope: hdb.geographicScope, accessStatus: hdb.accessStatus, licenceAccessNote: hdb.licenceAccessNote, snapshotPath: hdb.snapshotPath, snapshotSha256: hdb.snapshotSha256, evidenceStatus: "dated_replay" });
        expect(feature.properties.linkedDevelopmentIds).toEqual([]);
        expect(feature.properties.linkedCompetitorIds).toEqual([]);
      }
    }
    expect(map.overlapWarning).toContain("413 m");
    expect(map).toEqual(JSON.parse(readFileSync(resolve(process.cwd(), root, "places.geojson"), "utf8")));
  });

  it("rejects duplicate clusters and an unsupported join", () => {
    const records = originals();
    expect(() => buildReviewedMapSnapshot([records[0], records[0], records[2]])).toThrow();
    records[1].linkedCompetitorIds.push("unverified-outlet");
    expect(() => buildReviewedMapSnapshot(records)).toThrow();
  });
});
