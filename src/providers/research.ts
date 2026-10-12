import { z } from 'zod';

const nonempty = z.string().trim().min(1).max(1000);
const evidenceIds = z.array(z.string().trim().min(1).max(160)).min(1).max(12);
const researchOutputSchema = z.object({
  claims: z.array(z.object({ text: nonempty, evidenceIds, evidenceExcerpt: nonempty }).strict()).max(30),
  conflicts: z.array(z.object({ description: nonempty, evidenceIds }).strict()).max(20),
  unknowns: z.array(nonempty).max(30),
  nextInvestigation: nonempty,
}).strict();

export type ResearchOutput = z.infer<typeof researchOutputSchema>;

export function parseResearchOutput(value: unknown, availableEvidenceIds: readonly string[]): ResearchOutput {
  const output = researchOutputSchema.parse(value);
  const available = new Set(availableEvidenceIds);
  if (available.size !== availableEvidenceIds.length || availableEvidenceIds.some((id) => !id.trim())) {
    throw new Error('Invalid evidence inventory');
  }
  for (const item of [...output.claims, ...output.conflicts]) {
    if (new Set(item.evidenceIds).size !== item.evidenceIds.length || item.evidenceIds.some((id) => !available.has(id))) {
      throw new Error('Research output cites missing or duplicate evidence');
    }
  }
  if (output.claims.length === 0 && output.unknowns.length === 0) {
    throw new Error('Inconclusive research must name an unknown');
  }
  return output;
}

export type ResearchPageResult =
  | {
      status: "research_only";
      provider: "firecrawl";
      sourceUrl: string;
      resolvedUrl: string;
      retrievedAt: string;
      pageStatusCode: number;
      markdown: string;
      geographicScope: null;
      rightsStatus: "unverified";
    }
  | {
      status: "unavailable";
      provider: "firecrawl";
      sourceUrl: string;
      reason: "missing_api_key" | "request_budget_exhausted" | "rate_limited" | "provider_error" | "target_page_error" | "unexpected_source" | "invalid_response";
    };

export interface ResearchPageFetcher {
  fetchKnownUrl(sourceUrl: string): Promise<ResearchPageResult>;
}
