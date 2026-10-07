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
