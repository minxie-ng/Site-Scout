import { parseBlockCluster, type BlockCluster } from "./block-cluster";

const reviewedIds = [
  "punggol-point-cove-442a-442b-443a",
  "punggol-sapphire-267a-267b-267c",
  "punggol-ripples-211a-211b-211c",
] as const;

type Source = BlockCluster["sources"][number];

function distanceMetres(a: BlockCluster["members"][number], b: BlockCluster["members"][number]): number {
  const radians = Math.PI / 180;
  const lat = (b.latitude - a.latitude) * radians;
  const lon = (b.longitude - a.longitude) * radians;
  const h = Math.sin(lat / 2) ** 2 + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin(lon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

function citedSource(source: Source) {
  return {
    id: source.id,
    url: source.sourceUrl,
    retrievedAt: source.retrievedAt,
    publicationDate: source.publicationDate,
    geographicScope: source.geographicScope,
    accessStatus: source.accessStatus,
    licenceAccessNote: source.licenceAccessNote,
    snapshotPath: source.snapshotPath,
    snapshotSha256: source.snapshotSha256,
    evidenceStatus: "dated_replay" as const,
  };
}

/** Builds a bounded GeoJSON replay only from the three integrity-checked clusters. */
export function buildReviewedMapSnapshot(records: unknown[]) {
  if (records.length !== reviewedIds.length) throw new Error("Exactly three reviewed clusters are required");
  const clusters = records.map((record, index) => {
    const checked = parseBlockCluster(record);
    if (!checked.success || checked.data.id !== reviewedIds[index]) throw new Error("Cluster identity or evidence validation failed");
    return checked.data;
  });
  const allSourceIds = clusters.flatMap(cluster => [...cluster.sources, ...cluster.hdbSources].map(source => source.id));
  if (new Set(allSourceIds).size !== allSourceIds.length) throw new Error("Source IDs must be unique across the map");

  const features = clusters.flatMap(cluster => cluster.members.map(member => {
    const oneMap = cluster.sources.find(source => source.id === member.sourceId);
    const hdb = cluster.hdbSources.find(source => source.id === member.hdbResidentialEvidence.sourceId);
    if (!oneMap || !hdb) throw new Error("A map point lacks its checked source");
    return {
      type: "Feature" as const,
      id: `${cluster.id}:${member.blockId}`,
      geometry: { type: "Point" as const, coordinates: [member.longitude, member.latitude] as [number, number] },
      properties: {
        clusterId: cluster.id,
        clusterName: cluster.name,
        blockId: member.blockId,
        roadName: member.roadName,
        postalCode: member.postalCode,
        coordinateProvenance: member.provenance,
        clusterProvenance: cluster.selection.provenance,
        clusterEvidenceStatus: cluster.evidenceStatus,
        residential: member.hdbResidentialEvidence.residential,
        publishedDwellingUnits: member.hdbResidentialEvidence.totalDwellingUnits,
        yearCompleted: member.hdbResidentialEvidence.yearCompleted,
        oneMapSource: citedSource(oneMap),
        hdbSource: citedSource(hdb),
        linkedDevelopmentIds: cluster.linkedDevelopmentIds,
        linkedCompetitorIds: cluster.linkedCompetitorIds,
      },
    };
  }));
  const separation = Math.round(distanceMetres(clusters[1].members[0], clusters[2].members[0]));
  return {
    type: "FeatureCollection" as const,
    schemaVersion: 1,
    snapshotDate: "2026-10-06",
    decision: "insufficient_evidence" as const,
    clusters: clusters.map(cluster => ({ id: cluster.id, name: cluster.name, evidenceStatus: cluster.evidenceStatus, selection: cluster.selection })),
    overlapWarning: `Punggol Sapphire and Punggol Ripples anchors are ${separation} m apart straight-line and may share a customer catchment.`,
    features,
  };
}
