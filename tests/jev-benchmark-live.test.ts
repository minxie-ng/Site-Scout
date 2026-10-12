import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { claimBenchmarkSha256, parseClaimBenchmark } from '../src/providers/claim-benchmark';
import { runJevClaimBenchmark } from '../src/providers/claim-jev-benchmark';

function benchmarkKey(): string {
  const envFile = readFileSync(resolve('.env.local'), 'utf8');
  const line = envFile.split(/\r?\n/).find(value => value.startsWith('OPENROUTER_BENCHMARK_API_KEY='));
  return line?.slice('OPENROUTER_BENCHMARK_API_KEY='.length).trim().replace(/^['"]|['"]$/g, '') ?? '';
}

it.skipIf(process.env.RUN_LIVE_JEV_BENCHMARK !== '1')('runs one guarded live Jev comparison and saves a credential-free report', async () => {
  const cases = parseClaimBenchmark(JSON.parse(readFileSync(resolve('tests/fixtures/claim-check.json'), 'utf8')));
  const report = await runJevClaimBenchmark(cases, { benchmarkApiKey: benchmarkKey() });
  expect(report.status).toBe('evaluated');
  expect(report.results).toHaveLength(30);
  expect(report.autoAcceptanceEnabled).toBe(false);
  const observedAt = new Date().toISOString();
  const saved = { observedAt, fixture: 'synthetic_fixture', fixtureSha256: claimBenchmarkSha256(cases), ...report };
  const filename = `JEV_BENCHMARK_${observedAt.replace(/[:.]/g, '-')}.json`;
  writeFileSync(resolve('outputs', filename), `${JSON.stringify(saved, null, 2)}\n`, { flag: 'wx' });
}, 300_000);
