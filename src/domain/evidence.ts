import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { basename, isAbsolute, resolve, sep } from "node:path";
import { z } from "zod";

const snapshotRoot = resolve(process.cwd(), "src/data/snapshots/2026-10-05");
const originalRoot = resolve(snapshotRoot, "original");
const extractionRoot = resolve(snapshotRoot, "extractions");
const originalPrefix = "src/data/snapshots/2026-10-05/original/";
const extractionPrefix = "src/data/snapshots/2026-10-05/extractions/";

const reviewedSources = {
  "hdb-punggol-point-completion-annex-a": {
    url: "https://www.hdb.gov.sg/-/media/hdb-pulse/news/2025/final-two-pandemic-delayed-housing-projects-completed-in-january-2025/20012025---Annex-A.pdf",
    sha256: "bccb9d44ac47abd603604809a9e3f0eda36470db54e8dbf67fcc7bd3107fd8b2",
    extractionSha256: "e7f104692ed3bf0392ae0ba8d23910b7cbf46657277326cfd7ddedfdb4f027d6",
  },
  "onemap-821442": {
    url: "https://www.onemap.gov.sg/api/common/elastic/search?searchVal=821442&returnGeom=Y&getAddrDetails=Y&pageNum=1",
    sha256: "d3ea050f819e5d181404c6a40c776d86c71bf93153d2380df92c50ef5ffc7ad5",
  },
} as const;
// The prose metadata was manually reviewed for this single fixture. Pin it so an
// untrusted normalized record cannot change a caveat into a factual claim.
const reviewedMetadataSha256 = "3a5595da0987ebf93de85b6a666afefe831006f5ab9bcb2c131390bfad37986b";
const reviewedExcerpt = "Point Cove (Phase 2), which was completed in January 2025, comprises 1,179 units of";

const isoMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const sourceSchema = z.object({
  id: z.string().min(1),
  publisher: z.string().min(1),
  title: z.string().min(1),
  sourceUrl: z.url(),
  retrievedAt: z.iso.datetime({ offset: true }),
  publicationDate: z.iso.date().nullable(),
  publicationDateNote: z.string().min(1).nullable(),
  geographicScope: z.string().min(1),
  accessStatus: z.enum(["public_no_auth", "public_response_with_auth_warning"]),
  licenceAccessNote: z.string().min(1),
  snapshotPath: z.string().min(1),
  snapshotSha256: z.string().regex(/^[a-f0-9]{64}$/),
  extractionPath: z.string().min(1).optional(),
  extractionSha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  extractionNote: z.string().min(1).optional(),
}).strict();

export const developmentRecordSchema = z.object({
  id: z.literal("hdb-punggol-point-cove-phase-2-completion-2025-01"),
  schemaVersion: z.literal(1),
  evidenceStatus: z.literal("insufficient_evidence"),
  development: z.object({
    name: z.string().min(1),
    area: z.string().min(1),
    country: z.literal("Singapore"),
  }).strict(),
  status: z.object({
    value: z.enum(["announced", "launched", "under_construction", "completed"]),
    effectiveDate: isoMonthSchema,
    precision: z.literal("month"),
  }).strict(),
  unitCount: z.number().int().positive(),
  location: z.object({
    kind: z.literal("candidate_representative_block"),
    provenance: z.literal("derived_value"),
    relationshipEvidenceStatus: z.literal("not_established"),
    label: z.string().min(1),
    latitude: z.number().min(1.1).max(1.5),
    longitude: z.number().min(103.6).max(104.1),
    sourceIds: z.array(z.string().min(1)).min(2),
    limitation: z.string().min(1),
  }).strict(),
  decisionClaims: z.array(z.object({
    claim: z.string().min(1),
    support: z.literal("supported"),
    sourceIds: z.array(z.string().min(1)).min(1),
    evidenceExcerpt: z.string().min(1),
  }).strict()).length(1),
  sources: z.array(sourceSchema).min(2),
  fallback: z.object({
    trigger: z.string().min(1),
    action: z.string().min(1),
    limitation: z.string().min(1),
  }).strict(),
}).strict();

export type DevelopmentRecord = z.infer<typeof developmentRecordSchema>;

function metadataDigest(record: DevelopmentRecord): string {
  const metadata = {
    developmentArea: record.development.area,
    locationLabel: record.location.label,
    locationLimitation: record.location.limitation,
    fallback: record.fallback,
    sources: record.sources.map(source => ({
      id: source.id,
      publisher: source.publisher,
      title: source.title,
      retrievedAt: source.retrievedAt,
      publicationDate: source.publicationDate,
      publicationDateNote: source.publicationDateNote,
      geographicScope: source.geographicScope,
      accessStatus: source.accessStatus,
      licenceAccessNote: source.licenceAccessNote,
      extractionNote: source.extractionNote ?? null,
    })),
  };
  return createHash("sha256").update(JSON.stringify(metadata)).digest("hex");
}

function readCheckedFile(
  path: string,
  digest: string,
  prefix: string,
  root: string,
): string | null {
  if (isAbsolute(path) || !path.startsWith(prefix) || basename(path) !== path.slice(prefix.length)) return null;
  try {
    const realRoot = realpathSync(root);
    const realFile = realpathSync(resolve(process.cwd(), path));
    if (!realFile.startsWith(realRoot + sep)) return null;
    const bytes = readFileSync(realFile);
    if (createHash("sha256").update(bytes).digest("hex") !== digest) return null;
    return bytes.toString("utf8");
  } catch {
    return null;
  }
}

function addIssue(issues: z.core.$ZodIssue[], path: PropertyKey[], message: string) {
  issues.push({ code: "custom", path, message, input: undefined });
}

/** Audit only this reviewed HDB + OneMap record; new sources require a separate review. */
export function parseDevelopmentRecord(input: unknown): z.ZodSafeParseResult<DevelopmentRecord> {
  const parsed = developmentRecordSchema.safeParse(input);
  if (!parsed.success) return parsed;
  const record = parsed.data;
  const issues: z.core.$ZodIssue[] = [];
  if (metadataDigest(record) !== reviewedMetadataSha256) {
    addIssue(issues, [], "Provenance metadata differs from the manually reviewed record");
  }
  const sourceIds = record.sources.map(source => source.id);
  if (new Set(sourceIds).size !== sourceIds.length) addIssue(issues, ["sources"], "Source IDs must be unique");
  if (sourceIds.length !== 2 || !Object.keys(reviewedSources).every(id => sourceIds.includes(id))) {
    addIssue(issues, ["sources"], "The two reviewed source identities are required");
  }
  const contents = new Map<string, string>();
  let hdbExtraction: string | null = null;
  for (const [index, source] of record.sources.entries()) {
    const reviewed = reviewedSources[source.id as keyof typeof reviewedSources];
    if (!reviewed || source.sourceUrl !== reviewed.url || source.snapshotSha256 !== reviewed.sha256) {
      addIssue(issues, ["sources", index], "Source identity, URL, or reviewed digest differs");
      continue;
    }
    const content = readCheckedFile(source.snapshotPath, source.snapshotSha256, originalPrefix, originalRoot);
    if (content === null) addIssue(issues, ["sources", index, "snapshotPath"], "Original snapshot is missing, escaped, or fails SHA-256");
    else contents.set(source.id, content);
    if (source.id === "hdb-punggol-point-completion-annex-a") {
      const expected = reviewedSources["hdb-punggol-point-completion-annex-a"].extractionSha256;
      if (source.extractionSha256 !== expected || !source.extractionPath) {
        addIssue(issues, ["sources", index, "extractionSha256"], "Reviewed HDB extraction is required");
      } else {
        hdbExtraction = readCheckedFile(source.extractionPath, expected, extractionPrefix, extractionRoot);
        if (hdbExtraction === null) addIssue(issues, ["sources", index, "extractionPath"], "HDB extraction is missing, escaped, or fails SHA-256");
      }
      if (source.publicationDate !== null) addIssue(issues, ["sources", index, "publicationDate"], "The stored annex does not establish its publication date");
    }
  }
  const normalizedText = hdbExtraction?.replace(/\s+/g, " ");
  const phase2 = normalizedText?.match(/Point Cove \(Phase 2\), which was completed in (January) (2025), comprises ([\d,]+) units of .*? across (six) blocks\./);
  if (!phase2) addIssue(issues, ["decisionClaims", 0, "evidenceExcerpt"], "Reviewed HDB text does not establish the dated unit claim");
  else {
    const [, month, year, units] = phase2;
    if (record.development.name !== "Punggol Point Cove (Phase 2)" || record.status.value !== "completed" || record.status.effectiveDate !== `${year}-01` || record.unitCount !== Number(units.replaceAll(",", ""))) {
      addIssue(issues, ["status"], "Development status, month, or units differ from the HDB extraction");
    }
    const claim = record.decisionClaims[0];
    const expectedClaim = `Punggol Point Cove Phase 2 was completed in ${month} ${year} and comprises ${units} flats across six blocks.`;
    if (claim.claim !== expectedClaim || claim.sourceIds.length !== 1 || claim.sourceIds[0] !== "hdb-punggol-point-completion-annex-a" || claim.evidenceExcerpt !== reviewedExcerpt || !normalizedText?.includes(claim.evidenceExcerpt.replace(/\s+/g, " "))) {
      addIssue(issues, ["decisionClaims", 0], "Decision claim or excerpt is not bound to the reviewed HDB extraction");
    }
  }
  const oneMapRaw = contents.get("onemap-821442");
  if (oneMapRaw) {
    try {
      const response = JSON.parse(oneMapRaw) as { error?: string; results?: Array<{ BLK_NO?: string; BUILDING?: string; LATITUDE?: string; LONGITUDE?: string }> };
      const point = response.results?.[0];
      if (!response.error?.includes("Authentication token missing") || point?.BLK_NO !== "442A" || point?.BUILDING !== "PUNGGOL POINT COVE" || Number(point?.LATITUDE) !== record.location.latitude || Number(point?.LONGITUDE) !== record.location.longitude) {
        addIssue(issues, ["location"], "Candidate point or access warning differs from the OneMap snapshot");
      }
    } catch {
      addIssue(issues, ["location"], "OneMap snapshot is not valid JSON");
    }
  }
  if (record.location.sourceIds.length !== 2 || !Object.keys(reviewedSources).every(id => record.location.sourceIds.includes(id))) {
    addIssue(issues, ["location", "sourceIds"], "Candidate selection must cite HDB and OneMap");
  }
  if (issues.length) return { success: false, error: new z.ZodError(issues) as z.ZodError<DevelopmentRecord> };
  return parsed;
}
