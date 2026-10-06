import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import { z } from "zod";

const reviewedClusters = {
  "punggol-point-cove-442a-442b-443a": { metadataSha256: "0be981c8e944125e4e081725baa5d9f2f9fb55dbb7a29fa32c31c162849e551d", blockIds: "442A,442B,443A", hdbStreet: "NEW PUNGGOL RD", maxPairwiseMetres: 125 },
  "punggol-sapphire-267a-267b-267c": { metadataSha256: "d37d303c4bc45038407d2f14669942ed0d02a787bf6a32c2c260cbc13d151e01", blockIds: "267A,267B,267C", hdbStreet: "PUNGGOL FIELD", maxPairwiseMetres: 100 },
  "punggol-ripples-211a-211b-211c": { metadataSha256: "acb69b19775d8c145b118699d58e476e0d29e646548b97726c28f77fa34e421c", blockIds: "211A,211B,211C", hdbStreet: "PUNGGOL WALK", maxPairwiseMetres: 125 },
} as const;
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
  "onemap-267a": { path: "src/data/snapshots/2026-10-06/original/onemap-267a.json", sha256: "3f4732e6841b75865a3bd8ff4e002cfb23b867de43680ab1c817840ca1561f52" },
  "onemap-267b": { path: "src/data/snapshots/2026-10-06/original/onemap-267b.json", sha256: "801625a8352f2289fa2ff5526f7c20692429bfa4d1260cd3d0377ac82fc2abe4" },
  "onemap-267c": { path: "src/data/snapshots/2026-10-06/original/onemap-267c.json", sha256: "21d72f7069ad4c67d8a0b1add14f4ab99dc8fce8e37c011691bd0a160330bfb3" },
  "onemap-211a": { path: "src/data/snapshots/2026-10-06/original/onemap-211a.json", sha256: "69c09eec349be9db9a87c87b09e29d219fced544a8d946e58cf21be7a8bb6601" },
  "onemap-211b": { path: "src/data/snapshots/2026-10-06/original/onemap-211b.json", sha256: "8eee61b9e9dcb5806edd21b67b17492d82a500746397e837f2e8e73a5afa58d5" },
  "onemap-211c": { path: "src/data/snapshots/2026-10-06/original/onemap-211c.json", sha256: "7452433aca88224c2dc28cdccf3ddc3de2fc8e36ad50db9c5b7f7c0c879ef83b" },
} as const;
const reviewedHdbSources = {
  "hdb-property-442a": { path: "src/data/snapshots/2026-10-06/original/hdb-property-442a.json", sha256: "c5022fbd8207675c944bbd2e12368f70e832e9f9261ea30668cf0d2e496cd8b6" },
  "hdb-property-442b": { path: "src/data/snapshots/2026-10-06/original/hdb-property-442b.json", sha256: "499b445301cc93c1c5f4cb0d30c25cb930f7b210036b9ef8e1dcaffdc58563b4" },
  "hdb-property-443a": { path: "src/data/snapshots/2026-10-06/original/hdb-property-443a.json", sha256: "010ec6e779598d89cbce42aff223c10076912c35e21d34f3413e1361d457b956" },
  "hdb-property-267a": { path: "src/data/snapshots/2026-10-06/original/hdb-property-267a.json", sha256: "ef9603edaf293ce06df065dda46a1a57300d5fb69a9f999f4a291b21485b66cc" },
  "hdb-property-267b": { path: "src/data/snapshots/2026-10-06/original/hdb-property-267b.json", sha256: "d378b2c2eefc131daa0bc1c3aca72b8f627181f3fc01ae308d1cdbcf2c5c68e8" },
  "hdb-property-267c": { path: "src/data/snapshots/2026-10-06/original/hdb-property-267c.json", sha256: "9a1869e6bfecf8e36708e62d0a59958ee967dca075e2ff6ca3f01ea13161b7e6" },
  "hdb-property-211a": { path: "src/data/snapshots/2026-10-06/original/hdb-property-211a.json", sha256: "5f4219ba25d50e4cdc91a3bed1d4ddee1a20b507ec7c1f2dffc0185172a06595" },
  "hdb-property-211b": { path: "src/data/snapshots/2026-10-06/original/hdb-property-211b.json", sha256: "7e8ee73e0e95f0fb96f8b5c121cc6db0cb1684a8640aa8393e856f16d8f58c04" },
  "hdb-property-211c": { path: "src/data/snapshots/2026-10-06/original/hdb-property-211c.json", sha256: "7fe3d2c708ebfe6c2091dcafbb6d374763a3896d59d24ec06214e6d3ab3f63c6" },
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
  hdbResidentialEvidence: z.object({
    sourceId: z.string().min(1),
    street: z.string().min(1),
    residential: z.literal("Y"),
    totalDwellingUnits: z.number().int().positive(),
    yearCompleted: z.number().int().min(1937).max(2026),
  }).strict(),
}).strict();

const clusterSchema = z.object({
  id: z.enum(["punggol-point-cove-442a-442b-443a", "punggol-sapphire-267a-267b-267c", "punggol-ripples-211a-211b-211c"]),
  schemaVersion: z.literal(1),
  evidenceStatus: z.literal("candidate_cluster"),
  name: z.string().min(1),
  selection: z.object({
    provenance: z.literal("derived_value"),
    sourceIds: z.array(z.string().min(1)).length(3),
    rule: z.string().min(1),
    maxPairwiseMetres: z.number().positive(),
    limitation: z.string().min(1),
  }).strict(),
  members: z.array(memberSchema).length(3),
  linkedDevelopmentIds: z.array(z.string()).length(0),
  linkedCompetitorIds: z.array(z.string()).length(0),
  sources: z.array(sourceSchema).length(3),
  hdbSources: z.array(sourceSchema).length(3),
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

function checkedJsonSource(path: string, sha256: string): unknown | null {
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

/** Validates only the manually reviewed clusters; additional clusters require new evidence review. */
export function parseBlockCluster(input: unknown): z.ZodSafeParseResult<BlockCluster> {
  const parsed = clusterSchema.safeParse(input);
  if (!parsed.success) return parsed;
  const cluster = parsed.data;
  const reviewedCluster = reviewedClusters[cluster.id];
  const { members: _members, ...metadata } = cluster;
  const digest = createHash("sha256").update(JSON.stringify(metadata)).digest("hex");
  if (digest !== reviewedCluster.metadataSha256 || cluster.selection.maxPairwiseMetres !== reviewedCluster.maxPairwiseMetres) return fail("Cluster provenance differs from the reviewed record");

  const blockIds = cluster.members.map(member => member.blockId);
  const sourceIds = cluster.sources.map(source => source.id);
  if (new Set(blockIds).size !== 3 || new Set(sourceIds).size !== 3) return fail("Block and source IDs must be unique");
  if (blockIds.join(",") !== reviewedCluster.blockIds) return fail("The three reviewed block identities are required");

  for (const source of cluster.sources) {
    const reviewed = reviewedSources[source.id as keyof typeof reviewedSources];
    if (!reviewed || source.snapshotPath !== reviewed.path || source.snapshotSha256 !== reviewed.sha256) {
      return fail("Source path or reviewed digest differs");
    }
    const response = checkedJsonSource(source.snapshotPath, source.snapshotSha256) as {
      found?: number;
      results?: Array<{ BLK_NO?: string; ROAD_NAME?: string; BUILDING?: string; POSTAL?: string; LATITUDE?: string; LONGITUDE?: string }>;
    } | null;
    const member = cluster.members.find(item => item.sourceId === source.id);
    if (!response || !member || !Array.isArray(response.results)) return fail("Original OneMap response is missing or ambiguous");
    const matches = response.results.filter(point => point.BLK_NO === member.blockId && point.ROAD_NAME === member.roadName && point.BUILDING === member.buildingName && point.POSTAL === member.postalCode);
    if (matches.length !== 1) return fail("The residential-building address point is missing or ambiguous");
    const point = matches[0];
    if (point.BLK_NO !== member.blockId || point.ROAD_NAME !== member.roadName ||
      point.BUILDING !== member.buildingName || point.POSTAL !== member.postalCode ||
      Number(point.LATITUDE) !== member.latitude || Number(point.LONGITUDE) !== member.longitude) {
      return fail("Member identity or coordinate differs from the integrity-checked OneMap response");
    }
  }
  if (new Set(cluster.members.map(member => member.sourceId)).size !== 3) return fail("Each block needs its own source");
  if (new Set(cluster.hdbSources.map(source => source.id)).size !== 3 ||
    new Set(cluster.members.map(member => member.hdbResidentialEvidence.sourceId)).size !== 3) {
    return fail("Each block needs its own HDB property source");
  }
  for (const source of cluster.hdbSources) {
    const reviewed = reviewedHdbSources[source.id as keyof typeof reviewedHdbSources];
    if (!reviewed || source.snapshotPath !== reviewed.path || source.snapshotSha256 !== reviewed.sha256) {
      return fail("HDB source path or reviewed digest differs");
    }
    const response = checkedJsonSource(source.snapshotPath, source.snapshotSha256) as {
      success?: boolean;
      result?: { records?: Array<{ blk_no?: string; street?: string; residential?: string; total_dwelling_units?: string; year_completed?: string }> };
    } | null;
    const member = cluster.members.find(item => item.hdbResidentialEvidence.sourceId === source.id);
    if (!response?.success || !member || !Array.isArray(response.result?.records)) return fail("HDB property response is missing or invalid");
    const rows = response.result.records.filter(row => row.blk_no === member.blockId && row.street === reviewedCluster.hdbStreet);
    if (rows.length !== 1) return fail("HDB block-and-street identity is absent or ambiguous");
    const row = rows[0];
    const evidence = member.hdbResidentialEvidence;
    if (row.residential !== "Y" || evidence.residential !== row.residential || evidence.street !== row.street ||
      Number(row.total_dwelling_units) !== evidence.totalDwellingUnits || Number(row.year_completed) !== evidence.yearCompleted) {
      return fail("HDB residential claim differs from the integrity-checked block-and-street row");
    }
  }
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
