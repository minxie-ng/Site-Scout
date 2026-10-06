import { createHash } from "node:crypto";
import { z } from "zod";

// These are reviewed research leads. No operator page is retained as a licensed
// original, so this parser intentionally cannot promote an outlet to usable.
const reviewed = {
  "am-pilates-punggol": { operator: "am Pilates", address: "#12-111/112, 88 Punggol Way, Singapore 829913", role: "punggol_lead", service: "group_reformer", url: "https://www.ampilates.sg/contact" },
  "elevate-oasis": { operator: "Elevate Yoga+Pilates", address: "#03-09, 681 Punggol Drive, Singapore 820681", role: "punggol_lead", service: "group_reformer", url: "https://elevateyogapilates.rezerv.co/" },
  "root-rise-fernvale": { operator: "Root & Rise", address: "#02-08/09/10, 61 Fernvale Link, Singapore 799956", role: "regional_comparator", service: "group_reformer", url: "https://www.root8rise.com/faq" },
  "tirisula-kovan-1": { operator: "Tirisula Pilates", address: "#02-01, 1021 Upper Serangoon Road, Singapore 534759", role: "regional_comparator", service: "group_reformer", url: "https://tirisulapilates.com/locations" },
  "tirisula-kovan-2": { operator: "Tirisula Pilates", address: "#02-01, 1022A Upper Serangoon Road, Singapore 534760", role: "regional_comparator", service: "hybrid_reformer", url: "https://tirisulapilates.com/locations" },
  "sg-pilates-kovan": { operator: "SG Pilates", address: "#01-45, 988 Upper Serangoon Road, Singapore 534733", role: "regional_comparator", service: "group_reformer", url: "https://sgpilates.sg/" },
  "pilates-fitness-serangoon": { operator: "Pilates Fitness", address: "85A Serangoon Garden Way, Singapore 555981", role: "regional_comparator", service: "group_reformer", url: "https://pilatesfitness.com.sg/classes/" },
  "kove-hougang": { operator: "Kove Pilates", address: "371 Hougang Street 31, Singapore 530371", role: "regional_comparator", service: "private_reformer", url: "https://www.kovepilates.com/studio" },
} as const;

// Digest the reviewed supporting links and caveats in a fixed field order. This
// prevents a local snapshot edit from silently broadening rights or decision use.
const reviewedCaveatHashes: Record<keyof typeof reviewed, string> = {
  "am-pilates-punggol": "9b9b6e3928b3edf4d77d4484dfc8ad3e7b3c21c30690c370ff1644bb0d1e7fda",
  "elevate-oasis": "a3be58bb08d55456766e69390c95ede3e965bd3343b55723960b1c152a0d20f7",
  "root-rise-fernvale": "f1032d25f5d00cdcbc3d1f98f3997123e2cd3876306c11e7793b6f9b5f7e8583",
  "tirisula-kovan-1": "edf6d82e6f269eef1dcb5d5685d91de5e3eb53747b6090fa1812986f4340476f",
  "tirisula-kovan-2": "eac8cb319636f4277eec1077530060df69440781e932fe7144f849810f6f4068",
  "sg-pilates-kovan": "92570d70ac614ce67c3cda742da437e71019a4c1a55f3609b198745d3fcd7259",
  "pilates-fitness-serangoon": "212db5abeb1376d162ba892418cea9839ec0f7a5f422c926343f89a06edf7e4f",
  "kove-hougang": "ae67e6bb66ccc961fba44f83017e30471a9a8f5edd16167aef5f541a06bc8353",
};

const httpsUrl = z.url().refine(url => url.startsWith("https://"), "HTTPS source URL required");

const sourceSchema = z.object({
  url: httpsUrl,
  supportingUrls: z.array(httpsUrl),
  retrievedOn: z.iso.date(),
  publicationDate: z.null(),
  accessNote: z.string().min(15),
  rightsNote: z.string().min(15),
}).strict();

const outletSchema = z.object({
  id: z.enum(Object.keys(reviewed) as [keyof typeof reviewed, ...(keyof typeof reviewed)[]]),
  operator: z.string().min(1),
  address: z.string().min(1),
  geographicRole: z.enum(["punggol_lead", "regional_comparator"]),
  service: z.enum(["group_reformer", "hybrid_reformer", "private_reformer"]),
  evidenceStatus: z.literal("research_only"),
  coordinate: z.null(),
  normalPrice: z.null(),
  priceEffectiveDate: z.null(),
  linkedClusterIds: z.array(z.never()).length(0),
  source: sourceSchema,
  limitation: z.string().min(20),
}).strict();

const listSchema = z.object({
  schemaVersion: z.literal(1),
  retrievedOn: z.literal("2026-10-06"),
  decisionUse: z.literal("research_only_no_cluster_score"),
  outlets: z.array(outletSchema).length(8),
}).strict();

export type CompetitorLeads = z.infer<typeof listSchema>;

function caveatDigest(outlet: CompetitorLeads["outlets"][number]): string {
  return createHash("sha256").update(JSON.stringify({
    supportingUrls: outlet.source.supportingUrls,
    accessNote: outlet.source.accessNote,
    rightsNote: outlet.source.rightsNote,
    limitation: outlet.limitation,
  })).digest("hex");
}

export function parseCompetitorLeads(input: unknown): z.ZodSafeParseResult<CompetitorLeads> {
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return parsed;
  const seen = new Set<string>();
  for (const outlet of parsed.data.outlets) {
    const pinned = reviewed[outlet.id];
    if (seen.has(outlet.id) || outlet.operator !== pinned.operator || outlet.address !== pinned.address ||
      outlet.geographicRole !== pinned.role || outlet.service !== pinned.service || outlet.source.url !== pinned.url ||
      outlet.source.retrievedOn !== parsed.data.retrievedOn || caveatDigest(outlet) !== reviewedCaveatHashes[outlet.id]) {
      return { success: false, error: new z.ZodError([{ code: "custom", path: ["outlets"], message: "Outlet differs from reviewed research lead", input: outlet }]) as z.ZodError<CompetitorLeads> };
    }
    seen.add(outlet.id);
  }
  return parsed;
}
