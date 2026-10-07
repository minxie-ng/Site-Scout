import { assembleGate2Comparison } from "../domain/gate2-comparison";

const unresolvedForRealSite = [
  "current_exact_unit_availability",
  "all_in_rent",
  "usable_floor_area",
  "permitted_pilates_use",
  "walking_access",
  "local_competitor_catchment",
  "owner_confirmed_inputs",
  "verified_future_timing",
] as const;

/** A review queue from the validated snapshot, never a ranked site recommendation. */
export function buildReviewedInvestigationShortlist(input: Parameters<typeof assembleGate2Comparison>[0]) {
  const comparison = assembleGate2Comparison(input);
  return {
    outcome: comparison.decision,
    basis: "reviewed_gate2_snapshot" as const,
    selectionStatus: "not_ranked" as const,
    selectedCandidateId: null,
    nextInvestigation: "find_current_exact_premises" as const,
    candidates: comparison.clusters.map(cluster => {
      const point = comparison.evidencePoints.find(feature =>
        feature.properties.clusterId === cluster.id && feature.properties.blockId === cluster.blockIds[0]);
      if (!point) throw new Error("Reviewed cluster lacks a sourced anchor");
      return {
      id: cluster.id,
      name: cluster.name,
      blockIds: cluster.blockIds,
      outcome: cluster.decision,
      priorityRank: null,
      missingEvidence: [...unresolvedForRealSite],
      anchor: {
        basis: "representative_block_address_point" as const,
        blockId: point.properties.blockId,
        coordinates: point.geometry.coordinates,
        oneMapSource: point.properties.oneMapSource,
        hdbSource: point.properties.hdbSource,
        limitation: "An address point, not an exact premises or walking catchment.",
      },
    };
    }),
  };
}
