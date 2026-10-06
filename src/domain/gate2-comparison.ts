import { z } from "zod";
import { buildReviewedMapSnapshot } from "./map-snapshot";
import { parseCompetitorLeads } from "./competitor-leads";
import { parseDevelopmentRecord } from "./evidence";

const factorIds = ["rent", "premises_use", "competitors", "access", "demographics", "future_housing"] as const;
const reviewedFactorUrls = {
  rent: "https://www.propnex.com/listing-details/964412/106-hougang-avenue-1",
  premises_use: "https://www.ura.gov.sg/Corporate/Guidelines/Development-Control/Planning-Permission/Change-of-Use",
  competitors: "https://www.ampilates.sg/contact",
  access: "https://www.onemap.gov.sg/api/common/elastic/search?searchVal=Punggol%20Coast%20MRT%20Station&returnGeom=Y&getAddrDetails=Y&pageNum=1",
  demographics: "https://data.gov.sg/datasets/d_9e035622439b5d25a63d7ea0699c9451/view",
  future_housing: "https://assets.hdb.gov.sg/residential/buying-a-flat/finding-a-flat/sales-brochure/24FEBBTO_pdf_selection/matilda_riverside.pdf",
} as const;
const reviewedFactorDates = {
  rent: "2026-10-05",
  premises_use: "2026-10-06",
  competitors: "2026-10-05",
  access: "2026-10-06",
  demographics: "2026-10-06",
  future_housing: "2026-10-06",
} as const;
const factorSchema = z.object({
  id: z.enum(factorIds),
  status: z.literal("research_only"),
  linkedClusterIds: z.array(z.never()).length(0),
  sourceUrl: z.url().refine(url => url.startsWith("https://")),
  retrievedOn: z.iso.date(),
}).passthrough();
const feedSchema = z.object({
  snapshotDate: z.literal("2026-10-06"),
  decision: z.literal("insufficient_evidence"),
  factors: z.array(factorSchema).length(6),
}).passthrough();

type ComparisonInput = {
  clusters: unknown[];
  competitorLeads: unknown;
  development: unknown;
  factorFeed: unknown;
};

/** Offline Gate 2 evidence comparison. No market score or positive site decision is inferred. */
export function assembleGate2Comparison(input: ComparisonInput) {
  const map = buildReviewedMapSnapshot(input.clusters);
  const competitor = parseCompetitorLeads(input.competitorLeads);
  const development = parseDevelopmentRecord(input.development);
  const feed = feedSchema.safeParse(input.factorFeed);
  if (!competitor.success || !development.success || !feed.success) throw new Error("Gate 2 evidence validation failed");
  if (factorIds.some((id, index) => feed.data.factors[index]?.id !== id || feed.data.factors[index]?.sourceUrl !== reviewedFactorUrls[id] || feed.data.factors[index]?.retrievedOn !== reviewedFactorDates[id])) {
    throw new Error("Six reviewed business factor leads are required");
  }
  if (map.features.some(feature => feature.properties.linkedCompetitorIds.length || feature.properties.linkedDevelopmentIds.length)) {
    throw new Error("Unsupported source-to-cluster join");
  }
  return {
    snapshotDate: map.snapshotDate,
    decision: "insufficient_evidence" as const,
    evidencePoints: map.features,
    clusters: map.clusters.map(cluster => {
      const points = map.features.filter(feature => feature.properties.clusterId === cluster.id);
      return {
        id: cluster.id,
        name: cluster.name,
        blockIds: points.map(point => point.properties.blockId),
        publishedDwellingUnits: points.reduce((sum, point) => sum + point.properties.publishedDwellingUnits, 0),
        decision: "insufficient_evidence" as const,
        linkedCompetitorIds: [] as string[],
        linkedDevelopmentIds: [] as string[],
      };
    }),
    contextualDevelopment: {
      name: development.data.development.name,
      status: development.data.status,
      unitCount: development.data.unitCount,
      spatialUse: "not_established" as const,
    },
    competitorCoverage: {
      totalReviewedLeads: competitor.data.outlets.length,
      punggolLeads: competitor.data.outlets.filter(outlet => outlet.geographicRole === "punggol_lead").length,
      linkedToClusters: 0,
      pricingUse: "not_established" as const,
    },
    factorStatus: feed.data.factors.map(factor => ({ id: factor.id, status: factor.status, linkedClusterIds: factor.linkedClusterIds, sourceUrl: factor.sourceUrl, retrievedOn: factor.retrievedOn })),
    overlapWarning: map.overlapWarning,
  };
}
