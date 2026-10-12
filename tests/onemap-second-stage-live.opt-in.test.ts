import { createHash } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { loadHdbBlockLeads } from '../src/domain/hdb-block-leads';
import { isUsableSecondStageCapture, planSecondStageOneMapProbes,
  runSecondStageOneMapProbes } from '../src/providers/onemap-second-stage';

it.skipIf(process.env.RUN_ONEMAP_SECOND_STAGE !== '1')('captures at most 54 authenticated exact-address responses', async () => {
  const manifestPath = 'src/data/snapshots/2026-10-12/onemap-second-stage.json';
  expect(existsSync(manifestPath)).toBe(false);
  process.loadEnvFile('.env.local');
  const token = process.env.ONEMAP_API_TOKEN ?? '';
  expect(token && !token.startsWith('replace_with_')).toBe(true);
  const plan = planSecondStageOneMapProbes(loadHdbBlockLeads());
  const captures: Array<{ sourceUrl: string; retrievedAt: string; httpStatus: number | null; raw?: Uint8Array }> = [];
  const fetcher = async (input: string, init: RequestInit) => {
    const retrievedAt = new Date().toISOString();
    try {
      const response = await fetch(input, init);
      if (response.status !== 200) {
        captures.push({ sourceUrl: input, retrievedAt, httpStatus: response.status });
        return response;
      }
      if (!response.body) throw new Error('Missing OneMap body');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 64_000) { await reader.cancel(); throw new Error('OneMap body too large'); }
        chunks.push(part.value);
      }
      const raw = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { raw.set(chunk, offset); offset += chunk.byteLength; }
      if (new TextDecoder().decode(raw).includes(token)) throw new Error('Credential in response');
      captures.push({ sourceUrl: input, retrievedAt, httpStatus: 200, raw });
      return new Response(raw, { status: 200, headers: response.headers });
    } catch {
      captures.push({ sourceUrl: input, retrievedAt, httpStatus: null });
      throw new Error('OneMap request failed');
    }
  };
  const run = await runSecondStageOneMapProbes(plan, { token, quotaConfirmed: true, fetcher });
  expect(run.requestsMade).toBeLessThanOrEqual(54);
  expect(captures).toHaveLength(run.requestsMade);
  expect(run.status).toBe('complete');
  expect(isUsableSecondStageCapture(captures.map((capture, index) => ({
    townCode: plan.probes[index].townCode, status: run.results[index]?.status ?? 'not_run',
    httpStatus: capture.httpStatus, hasRaw: Boolean(capture.raw?.length),
  })))).toBe(true);
  const entries = captures.map((capture, index) => {
    const lead = plan.probes[index];
    const rawPath = capture.raw &&
      `src/data/snapshots/2026-10-12/original/onemap-second-stage-${lead.townCode.toLowerCase()}-${index % 2 + 1}.json`;
    return { townCode: lead.townCode, block: lead.block, street: lead.street,
      sourceUrl: capture.sourceUrl, retrievedAt: capture.retrievedAt, httpStatus: capture.httpStatus,
      rawPath: rawPath ?? null, sha256: capture.raw ? createHash('sha256').update(capture.raw).digest('hex') : null,
      reviewStatus: run.results[index]?.status ?? run.status, outcome: 'insufficient_evidence' };
  });
  expect(entries).toHaveLength(54);
  expect(entries.every(entry => entry.rawPath && !existsSync(entry.rawPath))).toBe(true);
  for (const [index, entry] of entries.entries()) writeFileSync(entry.rawPath!, captures[index].raw!, { flag: 'wx' });
  writeFileSync(manifestPath, JSON.stringify({ schemaVersion: 1, requestCeiling: 54,
    geographicScope: 'Two additional exact HDB block-and-street probes in each of 27 Singapore HDB contract-town codes',
    selectionRule: plan.selectionRule, proximityStatus: 'unverified', outcome: 'insufficient_evidence',
    selected: null, runStatus: run.status, requestsMade: run.requestsMade, entries }, null, 2) + '\n', { flag: 'wx' });
});
