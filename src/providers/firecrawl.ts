import { z } from "zod";
import type { ResearchPageFetcher, ResearchPageResult } from "./research";

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;
type Config = {
  apiKey?: string;
  allowedHosts: readonly string[];
  fetchImpl?: FetchLike;
  now?: () => Date;
};

const API_URL = "https://api.firecrawl.dev/v2/scrape";
const MAX_MARKDOWN_LENGTH = 100_000;
const DOCUMENT_PATH = /\.(?:pdf|docx?|xlsx?)$/i;
const responseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    markdown: z.string().min(1).max(MAX_MARKDOWN_LENGTH),
    metadata: z.object({
      sourceURL: z.url().optional(),
      url: z.url().optional(),
      statusCode: z.number().int(),
      contentType: z.string().optional(),
    }).passthrough(),
  }).passthrough(),
}).passthrough();

function checkedPageUrl(sourceUrl: string, allowedHosts: readonly string[]): URL {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new RangeError("A valid HTTPS source URL is required");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) {
    throw new RangeError("A public HTTPS source URL without credentials, port, or fragment is required");
  }
  if (!allowedHosts.includes(url.hostname)) throw new RangeError("Source URL is outside the allowed host list");
  if (DOCUMENT_PATH.test(url.pathname)) throw new RangeError("Document and PDF scrapes are outside this page-only retrieval");
  return url;
}

/** Optional one-request page extraction. It cannot create decision-ready evidence. */
export function createFirecrawlPageFetcher(config: Config): ResearchPageFetcher {
  let requestsUsed = 0;
  const fetchImpl = config.fetchImpl ?? fetch;
  const now = config.now ?? (() => new Date());
  return {
    async fetchKnownUrl(sourceUrl: string): Promise<ResearchPageResult> {
      const requested = checkedPageUrl(sourceUrl, config.allowedHosts);
      const unavailable = (reason: Extract<ResearchPageResult, { status: "unavailable" }>["reason"]): ResearchPageResult =>
        ({ status: "unavailable", provider: "firecrawl", sourceUrl, reason });
      if (!config.apiKey?.trim() || config.apiKey.startsWith("replace_with_")) return unavailable("missing_api_key");
      if (requestsUsed >= 1) return unavailable("request_budget_exhausted");
      requestsUsed += 1;
      try {
        const response = await fetchImpl(API_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: sourceUrl, formats: ["markdown"], maxAge: 0, storeInCache: false, timeout: 20000 }),
          signal: AbortSignal.timeout(25000),
        });
        if (response.status === 429) return unavailable("rate_limited");
        if (response.status !== 200) return unavailable("provider_error");
        const body = await response.text();
        if (body.length > 1_000_000) return unavailable("invalid_response");
        let raw: unknown;
        try {
          raw = JSON.parse(body);
        } catch {
          return unavailable("invalid_response");
        }
        const parsed = responseSchema.safeParse(raw);
        if (!parsed.success || !parsed.data.data.markdown.trim()) return unavailable("invalid_response");
        const page = parsed.data.data;
        if (!(page.metadata.statusCode >= 200 && page.metadata.statusCode < 300)) {
          return unavailable("target_page_error");
        }
        const metadataUrls = [page.metadata.sourceURL, page.metadata.url].filter((url): url is string => Boolean(url));
        if (metadataUrls.length === 0) return unavailable("invalid_response");
        const validSource = metadataUrls.every((value) => {
          const resolved = new URL(value);
          return resolved.protocol === "https:" && resolved.hostname === requested.hostname &&
            !resolved.username && !resolved.password && !resolved.port && !DOCUMENT_PATH.test(resolved.pathname);
        });
        if (!validSource || (metadataUrls.length > 1 && new URL(metadataUrls[0]).href !== new URL(metadataUrls[1]).href) ||
            page.metadata.contentType?.toLowerCase().includes("pdf")) {
          return unavailable("unexpected_source");
        }
        const resolvedUrl = metadataUrls[0];
        return {
          status: "research_only",
          provider: "firecrawl",
          sourceUrl,
          resolvedUrl,
          retrievedAt: now().toISOString(),
          pageStatusCode: page.metadata.statusCode,
          markdown: page.markdown,
          geographicScope: null,
          rightsStatus: "unverified",
        };
      } catch {
        return unavailable("provider_error");
      }
    },
  };
}

/** Read the credential only in the server process; never serialize it into results. */
export function createFirecrawlFromEnvironment(config: Omit<Config, "apiKey">): ResearchPageFetcher {
  return createFirecrawlPageFetcher({ ...config, apiKey: process.env.FIRECRAWL_API_KEY });
}
