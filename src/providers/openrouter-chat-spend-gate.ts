import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { AsyncSpendGate, AccountCapSnapshot } from './async-research-comparison';

const ENDPOINT = 'https://openrouter.ai/api/v1/key';
const keySchema = z.object({ data: z.object({
  limit: z.number().finite().positive(),
  limit_remaining: z.number().finite().nonnegative(),
  usage: z.number().finite().nonnegative(),
  limit_reset: z.null(),
}) });

async function readBoundedKeyResponse(response: Response): Promise<unknown> {
  if (!response.body) throw new Error('Missing key budget response');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 16384) {
        void reader.cancel().catch(() => {});
        throw new Error('Key budget response too large');
      }
      chunks.push(part.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { reader.releaseLock(); }
}

export type OpenRouterChatSpendGateOptions = Readonly<{
  apiKey: string;
  forbiddenApiKeys: readonly string[];
  maxAccountLimitUsd: number;
  maxRequestCostUsd: number;
  maxTotalAttempts: number;
  fetcher?: typeof fetch;
}>;

/** Local atomic reservations plus a separately capped, non-resetting provider key. */
export function createOpenRouterChatSpendGate(options: OpenRouterChatSpendGateOptions): AsyncSpendGate {
  if (!options.apiKey?.trim() || !options.forbiddenApiKeys?.length ||
    options.forbiddenApiKeys.some(key => !key?.trim() || key === options.apiKey) ||
    !Number.isFinite(options.maxAccountLimitUsd) || options.maxAccountLimitUsd <= 0 || options.maxAccountLimitUsd > 0.1 ||
    !Number.isFinite(options.maxRequestCostUsd) || options.maxRequestCostUsd <= 0 ||
    options.maxRequestCostUsd > options.maxAccountLimitUsd ||
    !Number.isSafeInteger(options.maxTotalAttempts) || options.maxTotalAttempts < 1 || options.maxTotalAttempts > 28) {
    throw new Error('Invalid dedicated chat benchmark spending configuration');
  }
  const config = { ...options, forbiddenApiKeys: [...options.forbiddenApiKeys] };
  const keyId = `chat-${createHash('sha256').update(config.apiKey).digest('hex').slice(0, 16)}`;
  const reservations = new Map<string, number>();
  let initialRemaining: number | null = null;
  let lowestRemoteRemaining: number | null = null;
  let knownSpent = 0;
  let attempts = 0;
  let verified = false;

  const remaining = () => Math.max(0, Math.min(initialRemaining ?? 0, lowestRemoteRemaining ?? 0) - knownSpent -
    [...reservations.values()].reduce((sum, amount) => sum + amount, 0));

  async function check(): Promise<AccountCapSnapshot> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timedOut = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('Key budget request timed out')); }, 8000);
      });
      const request = (async () => {
        const response = await (config.fetcher ?? fetch)(ENDPOINT, {
          headers: { Authorization: `Bearer ${config.apiKey}`, Accept: 'application/json' }, signal: controller.signal,
        });
        if (!response.ok) throw new Error('Key budget unavailable');
        return keySchema.parse(await readBoundedKeyResponse(response)).data;
      })();
      const data = await Promise.race([request, timedOut]);
      if (data.limit > config.maxAccountLimitUsd || data.limit_remaining > data.limit) {
        throw new Error('Benchmark key cap exceeds approved limit');
      }
      if (initialRemaining === null) initialRemaining = data.limit_remaining;
      lowestRemoteRemaining = Math.min(lowestRemoteRemaining ?? data.limit_remaining, data.limit_remaining);
      verified = true;
      return { keyId, purpose: 'dedicated_chat_benchmark', limitUsd: data.limit,
        remainingUsd: remaining(), resetAt: null };
    } catch {
      verified = false;
      throw new Error('Dedicated chat benchmark key cap unavailable or invalid');
    } finally { if (timer) clearTimeout(timer); }
  }

  async function reserve(requestKeyId: string, amountUsd: number): Promise<string | null> {
    // No await before updating state: concurrent calls on this gate cannot reserve the same balance.
    if (!verified || requestKeyId !== keyId || amountUsd !== config.maxRequestCostUsd ||
      attempts >= config.maxTotalAttempts || remaining() < amountUsd) return null;
    const reservationId = randomUUID();
    reservations.set(reservationId, amountUsd);
    attempts += 1;
    return reservationId;
  }

  async function settle(reservationId: string, reportedCostUsd: number): Promise<void> {
    const amount = reservations.get(reservationId);
    if (amount === undefined || !Number.isFinite(reportedCostUsd) || reportedCostUsd < 0) {
      throw new Error('Invalid chat benchmark settlement');
    }
    reservations.delete(reservationId);
    knownSpent += reportedCostUsd;
    if (reportedCostUsd > amount) {
      verified = false;
      throw new Error('Chat benchmark charge exceeded reservation');
    }
  }

  return Object.freeze({ maxRequestCostUsd: config.maxRequestCostUsd, maxTotalAttempts: config.maxTotalAttempts,
    check, reserve, settle });
}
