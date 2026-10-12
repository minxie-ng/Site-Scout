import { z } from 'zod';
import type { AsyncResearchCaller, AsyncResearchCallRequest, AsyncResearchCallResult } from './async-research-comparison';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MAX_RESPONSE_BYTES = 65536;
const responseSchema = z.object({
  model: z.string().min(1),
  choices: z.array(z.object({
    finish_reason: z.literal('stop'),
    message: z.object({ content: z.string().min(1).max(16000) }),
  })).length(1),
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative(),
    completion_tokens: z.number().int().nonnegative(),
    cost: z.number().finite().nonnegative(),
  }),
});

export type OpenRouterAsyncResearchOptions = Readonly<{
  apiKey: string;
  maxPromptBytes: number;
  maxRequestCostUsd: number;
  fetcher?: typeof fetch;
}>;

function failure(request: AsyncResearchCallRequest, reason: string, cost: number | null = null,
  model = request.requestedModel): AsyncResearchCallResult {
  return { status: 'failed', provider: 'openrouter', model, reason, reportedCostUsd: cost };
}

async function readBounded(response: Response): Promise<unknown | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        // A hostile stream may never settle cancel(); do not let cleanup hold the transport open.
        void reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(part.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return null; }
  finally { reader.releaseLock(); }
}

/** Transport only: the runner owns account-cap checks, attempts, timeouts and decision authority. */
export function createOpenRouterAsyncResearchCaller(options: OpenRouterAsyncResearchOptions): AsyncResearchCaller {
  const config = { ...options };
  return async request => {
    if (!config.apiKey?.trim() || !Number.isSafeInteger(config.maxPromptBytes) || config.maxPromptBytes < 1 ||
      !Number.isFinite(config.maxRequestCostUsd) || config.maxRequestCostUsd <= 0 ||
      !request.requestedModel?.trim() || request.signal.aborted) {
      return failure(request, request.signal.aborted ? 'request_aborted' : 'invalid_configuration');
    }
    const messages = [
      { role: 'system', content: request.systemInstruction },
      { role: 'user', content: JSON.stringify({ task: request.roleInstruction, caseData: request.caseData,
        outputContract: request.outputContract, evidenceHash: request.evidenceHash, evidenceIds: request.evidenceIds }) },
    ];
    if (Buffer.byteLength(JSON.stringify(messages), 'utf8') > config.maxPromptBytes) {
      return failure(request, 'prompt_budget_exceeded');
    }
    try {
      const response = await (config.fetcher ?? fetch)(ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: request.requestedModel, messages,
          max_completion_tokens: request.maxOutputTokens, stream: false, temperature: 0,
          response_format: { type: 'json_object' } }),
        signal: request.signal,
      });
      const raw = await readBounded(response);
      const cost = z.object({ usage: z.object({ cost: z.number().finite().nonnegative() }) }).safeParse(raw);
      const knownCost = cost.success ? cost.data.usage.cost : null;
      const model = z.object({ model: z.string().min(1) }).safeParse(raw);
      const servedModel = model.success ? model.data.model : request.requestedModel;
      if (!response.ok) return failure(request, 'provider_error', knownCost, servedModel);
      const finish = z.object({ choices: z.array(z.object({ finish_reason: z.string() })).min(1) }).safeParse(raw);
      if (finish.success && finish.data.choices[0].finish_reason === 'length') {
        return failure(request, 'output_truncated', knownCost, servedModel);
      }
      const parsed = responseSchema.safeParse(raw);
      if (!parsed.success) return failure(request, 'invalid_response', knownCost, servedModel);
      if (parsed.data.model !== request.requestedModel) {
        return failure(request, 'served_model_mismatch', parsed.data.usage.cost, parsed.data.model);
      }
      if (parsed.data.usage.cost > config.maxRequestCostUsd ||
        parsed.data.usage.completion_tokens > request.maxOutputTokens) {
        return failure(request, 'request_budget_exceeded', parsed.data.usage.cost, parsed.data.model);
      }
      let output: unknown;
      try { output = JSON.parse(parsed.data.choices[0].message.content); }
      catch { return failure(request, 'invalid_response', parsed.data.usage.cost, parsed.data.model); }
      return { status: 'ok', provider: 'openrouter', model: parsed.data.model, output,
        reportedCostUsd: parsed.data.usage.cost };
    } catch {
      // A request may have reached the provider; abort/network errors are not proof of zero charge.
      return failure(request, request.signal.aborted ? 'request_aborted' : 'request_failed');
    }
  };
}
