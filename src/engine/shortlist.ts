import { assembleGate2Comparison } from "../domain/gate2-comparison";
import { haversineDistanceMeters } from "./spatial";

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

/** Research ordering only. A tied stock proxy cannot identify a unique lead. */
export function chooseAreaResearchPriority(clusters: readonly { id: string; publishedDwellingUnits: number }[]) {
  if (!clusters.length || !hasUniqueClusterIds(clusters) ||
      clusters.some(cluster => !Number.isSafeInteger(cluster.publishedDwellingUnits) || cluster.publishedDwellingUnits < 0)) return null;
  const greatest = Math.max(...clusters.map(cluster => cluster.publishedDwellingUnits));
  const leaders = clusters.filter(cluster => cluster.publishedDwellingUnits === greatest);
  return leaders.length === 1 ? leaders[0]!.id : null;
}

function hasUniqueClusterIds(clusters: readonly { id: string }[]) {
  return clusters.every(cluster => typeof cluster.id === "string" && cluster.id.trim().length > 0) &&
    new Set(clusters.map(cluster => cluster.id)).size === clusters.length;
}

/** Apply explicit eligibility before the housing-stock proxy; never break a tie arbitrarily. */
export function chooseEligibleResearchLead(
  clusters: readonly { id: string; publishedDwellingUnits: number }[],
  eligibleClusterIds: readonly string[],
) {
  const knownIds = new Set(clusters.map(cluster => cluster.id));
  if (!hasUniqueClusterIds(clusters) || new Set(eligibleClusterIds).size !== eligibleClusterIds.length ||
      eligibleClusterIds.some(id => !knownIds.has(id))) return null;
  return chooseAreaResearchPriority(clusters.filter(cluster => eligibleClusterIds.includes(cluster.id)));
}

type HypotheticalAreaFactor = {
  clusterId: string;
  evidenceKind: string;
  assumedWalkingMinutes: number;
  assumedNearbyCompetitors: number;
};

/** Directional check only: a better hypothetical factor does not establish an overall rank. */
export function assessAreaPrioritySensitivity(
  shortlist: ReturnType<typeof buildReviewedInvestigationShortlist>,
  factors: readonly HypotheticalAreaFactor[],
) {
  const clusterIds: string[] = shortlist.candidates.map(candidate => candidate.id);
  if (!shortlist.selectedCandidateId || factors.length !== clusterIds.length ||
      new Set(factors.map(factor => factor.clusterId)).size !== clusterIds.length ||
      factors.some(factor => !clusterIds.includes(factor.clusterId))) {
    throw new Error("A complete, unique factor row is required for each reviewed cluster");
  }
  if (factors.some(factor => factor.evidenceKind !== "synthetic_assumption")) {
    throw new Error("Only explicitly synthetic factor scenarios are supported");
  }
  if (factors.some(factor => !Number.isFinite(factor.assumedWalkingMinutes) || factor.assumedWalkingMinutes < 0 ||
      !Number.isSafeInteger(factor.assumedNearbyCompetitors) || factor.assumedNearbyCompetitors < 0)) {
    throw new Error("Invalid hypothetical access or competitor value");
  }
  const lead = factors.find(factor => factor.clusterId === shortlist.selectedCandidateId)!;
  const alternativeAdvantageClusterIds = factors.filter(factor => factor.clusterId !== lead.clusterId &&
    (factor.assumedWalkingMinutes < lead.assumedWalkingMinutes ||
     factor.assumedNearbyCompetitors < lead.assumedNearbyCompetitors)).map(factor => factor.clusterId);
  return {
    evidenceKind: "synthetic_assumption" as const,
    status: alternativeAdvantageClusterIds.length ? "factor_tradeoff_in_scenario" as const : "no_factor_advantage_in_scenario" as const,
    alternativeAdvantageClusterIds,
    rankingEffect: "not_determined" as const,
    siteOutcome: "insufficient_evidence" as const,
  };
}

/** A conditional research order under fully labelled assumptions, not a real area or site decision. */
export function compareHypotheticalAreaResearchOrder(
  input: Parameters<typeof assembleGate2Comparison>[0],
  scenario: {
    evidenceKind: string;
    factors: readonly HypotheticalAreaFactor[];
    maxAssumedWalkingMinutes: number;
    maxAssumedNearbyCompetitors: number;
  },
) {
  if (scenario.evidenceKind !== "synthetic_assumption") throw new Error("Only explicitly synthetic scenarios are supported");
  if (!Number.isFinite(scenario.maxAssumedWalkingMinutes) || scenario.maxAssumedWalkingMinutes < 0 ||
      !Number.isSafeInteger(scenario.maxAssumedNearbyCompetitors) || scenario.maxAssumedNearbyCompetitors < 0) {
    throw new Error("Invalid hypothetical screening threshold");
  }
  const shortlist = buildReviewedInvestigationShortlist(input);
  assessAreaPrioritySensitivity(shortlist, scenario.factors);
  const candidateTrace = shortlist.candidates.map(candidate => {
    const factor = scenario.factors.find(row => row.clusterId === candidate.id)!;
    return {
      clusterId: candidate.id,
      assumedWalkingMinutes: factor.assumedWalkingMinutes,
      assumedNearbyCompetitors: factor.assumedNearbyCompetitors,
      publishedDwellingUnits: candidate.publishedDwellingUnits,
      hdbSources: candidate.hdbSources,
      qualifies: factor.assumedWalkingMinutes <= scenario.maxAssumedWalkingMinutes &&
        factor.assumedNearbyCompetitors <= scenario.maxAssumedNearbyCompetitors,
    };
  });
  const eligibleClusterIds = candidateTrace.filter(row => row.qualifies).map(row => row.clusterId);
  const selectedClusterId = chooseEligibleResearchLead(shortlist.candidates, eligibleClusterIds);
  return {
    evidenceKind: "synthetic_assumption" as const,
    policy: "thresholds_then_highest_published_housing_stock" as const,
    assumptionLimits: {
      maxAssumedWalkingMinutes: scenario.maxAssumedWalkingMinutes,
      maxAssumedNearbyCompetitors: scenario.maxAssumedNearbyCompetitors,
    },
    candidateTrace,
    eligibleClusterIds,
    selectedClusterId,
    selectionStatus: selectedClusterId ? "hypothetical_research_lead" as const : "no_unique_hypothetical_lead" as const,
    siteOutcome: "insufficient_evidence" as const,
  };
}

/** A source-backed area research priority, never a ranked site recommendation. */
export function buildReviewedInvestigationShortlist(input: Parameters<typeof assembleGate2Comparison>[0]) {
  const comparison = assembleGate2Comparison(input);
  const anchorPoints = comparison.clusters.map(cluster => {
    const point = comparison.evidencePoints.find(feature =>
      feature.properties.clusterId === cluster.id && feature.properties.blockId === cluster.blockIds[0]);
    if (!point) throw new Error("Reviewed cluster lacks a sourced anchor");
    return point;
  });
  const candidatePairs = anchorPoints.flatMap((first, index) => anchorPoints.slice(index + 1).map(second => ({
    first,
    second,
    metres: haversineDistanceMeters(
      { latitude: first.geometry.coordinates[1], longitude: first.geometry.coordinates[0] },
      { latitude: second.geometry.coordinates[1], longitude: second.geometry.coordinates[0] },
    ),
  })));
  const closest = candidatePairs.reduce((best, pair) => pair.metres < best.metres ? pair : best);
  const selectedCandidateId = chooseAreaResearchPriority(comparison.clusters);
  const selectedCluster = comparison.clusters.find(cluster => cluster.id === selectedCandidateId);
  const selectedPoints = comparison.evidencePoints.filter(feature => feature.properties.clusterId === selectedCandidateId);
  const areaFactorCoverage = (["access", "competitors"] as const).map(factor => {
    const lead = comparison.factorStatus.find(record => record.id === factor)!;
    return {
      factor,
      status: "research_only_unlinked" as const,
      linkedClusterIds: lead.linkedClusterIds,
      sourceUrl: lead.sourceUrl,
      retrievedOn: lead.retrievedOn,
    };
  });
  return {
    outcome: comparison.decision,
    basis: "reviewed_gate2_snapshot" as const,
    recommendationScope: "pre_intake_research_triage" as const,
    independentCustomerCatchmentsEstablished: false as const,
    closestCandidatePair: {
      clusterIds: [closest.first.properties.clusterId, closest.second.properties.clusterId],
      roundedStraightLineMetres: Math.round(closest.metres),
      basis: "representative_block_address_points" as const,
      marketCatchmentRelation: "not_established" as const,
      nextCheck: "verify_shared_walking_catchment_before_independent_ranking" as const,
      oneMapSources: [closest.first.properties.oneMapSource, closest.second.properties.oneMapSource],
    },
    areaFactorCoverage,
    areaFactorMatrix: comparison.clusters.map(cluster => ({
      clusterId: cluster.id,
      factors: areaFactorCoverage.map(lead => ({
        factor: lead.factor,
        applicability: "unknown_for_cluster" as const,
        evidenceStatus: "research_only" as const,
        sourceUrl: lead.sourceUrl,
        retrievedOn: lead.retrievedOn,
        geographicScope: lead.factor === "access"
          ? "Punggol Coast MRT station lead, Singapore; no verified route to candidate blocks"
          : "Punggol operator lead, Singapore; no verified competitor catchment for candidate blocks",
      })),
    })),
    selectionStatus: selectedCandidateId ? "investigate_first_area" as const : "not_ranked" as const,
    selectedCandidateId,
    nextInvestigation: "compare_access_and_competition" as const,
    areaPriority: selectedCluster ? {
      basis: "highest_published_dwelling_units_among_sampled_blocks" as const,
      units: selectedCluster.publishedDwellingUnits,
      evidenceKind: "observed_housing_stock_proxy" as const,
      applicability: "business_agnostic_not_personalized" as const,
      hdbSources: selectedPoints.map(point => point.properties.hdbSource),
      unresolvedComparisons: ["walking_access", "local_competitor_catchment", "owner_confirmed_inputs", "verified_future_timing"] as const,
      leaseChecks: ["current_exact_unit_availability", "all_in_rent", "usable_floor_area", "permitted_pilates_use"] as const,
      limitation: "Published dwelling units are not Pilates demand or proof this is the best area; unmeasured access, competition, costs, and owner needs could reverse this research priority.",
    } : null,
    candidates: comparison.clusters.map((cluster, index) => {
      const point = anchorPoints[index]!;
      return {
      id: cluster.id,
      name: cluster.name,
      blockIds: cluster.blockIds,
      publishedDwellingUnits: cluster.publishedDwellingUnits,
      hdbSources: comparison.evidencePoints.filter(feature => feature.properties.clusterId === cluster.id)
        .map(feature => feature.properties.hdbSource),
      outcome: cluster.decision,
      priorityRank: cluster.id === selectedCandidateId ? 1 as const : null,
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
