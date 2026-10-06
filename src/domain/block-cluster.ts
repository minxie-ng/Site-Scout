import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import { z } from "zod";

const reviewedMetadataSha256 = "be1532ef33bc59629faf3437153b0fde7bf8a854611ae054916468a13cfcbcef";
const reviewedSources = {
  "onemap-821442": {
    path: "src/data/snapshots/2026-10-05/original/onemap-821442.json",
    sha256: "d3ea050f819e5d181404c6a40c776d86c71bf93153d2380df92c50ef5ffc7ad5",
  },
  "onemap-442b-new-punggol-road": {
    path: "src/data/snapshots/2026-10-06/original/onemap-442b.json",
    sha256: "c53f2846ece9ea249003f0907f6960dc8d74846e0aeb14032725557e4b61cb9b",
  },
  "onemap-443a-new-punggol-road": {
    path: "src/data/snapshots/2026-10-06/original/onemap-443a.json",
    sha256: "3033f51fe25a7fd53ba9d8afe99be442426707329101af99311397b553a5c8f3",
  },
} as const;

const sourceSchema = z.object({
  id: z.string().min(1),
  publisher: z.string().min(1),
  title: z.string().min(1),
  sourceUrl: z.url(),
  retrievedAt: z.iso.datetime(),
  publicationDate: z.null(),
  geographicScope: z.string().min(1),
  accessStatus: z.string().min(1),
  licenceAccessNote: z.string().min(1),
  snapshotPath: z.string().min(1),
  snapshotSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

const memberSchema = z.object({
  blockId: z.string().min(1),
  roadName: z.string().min(1),
  buildingName: z.string().min(1),
  postalCode: z.string().regex(/^\d{6}$/),
  latitude: z.number().min(1.1).max(1.5),
  longitude: z.number().min(103.6).max(104.1),
  provenance: z.literal("observed_fact"),
  sourceId: z.string().min(1),
}).strict();

const clusterSchema = z.object({
  id: z.literal("punggol-point-cove-442a-442b-443a"),
  schemaVersion: z.literal(1),
  evidenceStatus: z.literal("candidate_cluster"),
  name: z.string().min(1),
  selection: z.object({
    provenance: z.literal("derived_value"),
    sourceIds: z.array(z.string().min(1)).length(3),
    rule: z.string().min(1),
    maxPairwiseMetres: z.literal(125),
    limitation: z.string().min(1),
  }).strict(),
  members: z.array(memberSchema).length(3),
  linkedDevelopmentIds: z.array(z.string()).length(0),
  linkedCompetitorIds: z.array(z.string()).length(0),
  sources: z.array(sourceSchema).length(3),
  fallback: z.object({
    trigger: z.string().min(1),
    action: z.string().min(1),
    limitation: z.string().min(1),
  }).strict(),
}).strict();

export type BlockCluster = z.infer<typeof clusterSchema>;

function metresBetween(a: BlockCluster["members"][number], b: BlockCluster["members"][number]): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

function checkedOneMapSource(path: string, sha256: string): unknown | null {
  try {
    const root = realpathSync(resolve(process.cwd(), "src/data/snapshots"));
    const file = realpathSync(resolve(process.cwd(), path));
    if (!file.startsWith(root + sep)) return null;
    const bytes = readFileSync(file);
    if (createHash("sha256").update(bytes).digest("hex") !== sha256) return null;
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    return null;
  }
}

function fail(message: string): z.ZodSafeParseResult<BlockCluster> {
  return { success: false, error: new z.ZodError([{ code: "custom", path: [], message, input: undefined }]) as z.ZodError<BlockCluster> };
}

/** Validates only this manually reviewed cluster; additional clusters require new evidence review. */
export function parseBlockCluster(input: unknown): z.ZodSafeParseResult<BlockCluster> {
  const parsed = clusterSchema.safeParse(input);
  if (!parsed.success) return parsed;
  const cluster = parsed.data;
  const { members: _members, ...metadata } = cluster;
  const digest = createHash("sha256").update(JSON.stringify(metadata)).digest("hex");
  if (digest !== reviewedMetadataSha256) return fail("Cluster provenance differs from the reviewed record");

  const blockIds = cluster.members.map(member => member.blockId);
  const sourceIds = cluster.sources.map(source => source.id);
  if (new Set(blockIds).size !== 3 || new Set(sourceIds).size !== 3) return fail("Block and source IDs must be unique");
  if (blockIds.join(",") !== "442A,442B,443A") return fail("The three reviewed block identities are required");

  for (const source of cluster.sources) {
    const reviewed = reviewedSources[source.id as keyof typeof reviewedSources];
    if (!reviewed || source.snapshotPath !== reviewed.path || source.snapshotSha256 !== reviewed.sha256) {
      return fail("Source path or reviewed digest differs");
    }
    const response = checkedOneMapSource(source.snapshotPath, source.snapshotSha256) as {
      found?: number;
      results?: Array<{ BLK_NO?: string; ROAD_NAME?: string; BUILDING?: string; POSTAL?: string; LATITUDE?: string; LONGITUDE?: string }>;
    } | null;
    if (!response || response.found !== 1 || response.results?.length !== 1) return fail("Original OneMap response is missing or ambiguous");
    const point = response.results[0];
    const member = cluster.members.find(item => item.sourceId === source.id);
    if (!member || point.BLK_NO !== member.blockId || point.ROAD_NAME !== member.roadName ||
      point.BUILDING !== member.buildingName || point.POSTAL !== member.postalCode ||
      Number(point.LATITUDE) !== member.latitude || Number(point.LONGITUDE) !== member.longitude) {
      return fail("Member identity or coordinate differs from the integrity-checked OneMap response");
    }
  }
  if (new Set(cluster.members.map(member => member.sourceId)).size !== 3) return fail("Each block needs its own source");
  if (cluster.selection.sourceIds.join(",") !== cluster.members.map(member => member.sourceId).join(",")) {
    return fail("Derived selection must cite every member point source");
  }
  for (let i = 0; i < cluster.members.length; i++) {
    for (let j = i + 1; j < cluster.members.length; j++) {
      if (metresBetween(cluster.members[i], cluster.members[j]) > cluster.selection.maxPairwiseMetres) {
        return fail("Reviewed blocks exceed the stated pairwise distance rule");
      }
    }
  }
  return parsed;
}
