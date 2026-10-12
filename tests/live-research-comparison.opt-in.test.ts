import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { runLiveResearchComparison } from '../src/providers/live-research-comparison';

const read = (path: string) => JSON.parse(readFileSync(resolve(path), 'utf8'));
function localKey(name: string): string {
  const line = readFileSync(resolve('.env.local'), 'utf8').split(/\r?\n/)
    .find(value => value.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '') ?? '';
}
const snapshot = () => ({
  clusters: ['block-cluster.json', 'punggol-sapphire-cluster.json', 'punggol-ripples-cluster.json']
    .map(name => read(`src/data/snapshots/2026-10-06/${name}`)),
  competitorLeads: read('src/data/snapshots/2026-10-06/competitor-leads.json'),
  development: read('src/data/snapshots/2026-10-05/developments.json'),
  factorFeed: read('prototype/data.json'),
});

it.skipIf(process.env.RUN_LIVE_RESEARCH_CANARY !== '1')(
  'runs one capped response-format canary and saves its diagnostics', async () => {
    const input = snapshot();
    const result = await runLiveResearchComparison(input, input.clusters[0].id, {
      benchmarkApiKey: localKey('OPENROUTER_BENCHMARK_API_KEY'),
      generalApiKey: localKey('OPENROUTER_API_KEY'), mode: 'canary',
    });
    const observedAt = new Date().toISOString();
    const filename = `RESEARCH_CANARY_${observedAt.replace(/[:.]/g, '-')}.json`;
    writeFileSync(resolve('outputs', filename), `${JSON.stringify({ observedAt, ...result }, null, 2)}\n`, { flag: 'wx' });
    expect(result.status).toBe('ran');
    expect(result.comparison?.total.attemptedCalls).toBe(1);
    expect(result.comparison?.attempts[0].status).toBe('ok');
  }, 45_000,
);

it.skipIf(process.env.RUN_LIVE_RESEARCH_MARKET_DIAGNOSTIC !== '1')(
  'runs one capped market-role diagnostic and saves only safe validation metadata', async () => {
    const input = snapshot();
    const result = await runLiveResearchComparison(input, input.clusters[0].id, {
      benchmarkApiKey: localKey('OPENROUTER_BENCHMARK_API_KEY'),
      generalApiKey: localKey('OPENROUTER_API_KEY'), mode: 'diagnostic_market',
    });
    const observedAt = new Date().toISOString();
    const filename = `RESEARCH_MARKET_DIAGNOSTIC_${observedAt.replace(/[:.]/g, '-')}.json`;
    writeFileSync(resolve('outputs', filename), `${JSON.stringify({ observedAt, ...result }, null, 2)}\n`, { flag: 'wx' });
    expect(result.status).toBe('ran');
    expect(result.comparison?.total.attemptedCalls).toBe(1);
    expect(result.comparison?.attempts[0]).toMatchObject({ role: 'market', arm: 'roles' });
  }, 45_000,
);

it.skipIf(process.env.RUN_LIVE_RESEARCH_AREA_DIAGNOSTIC !== '1')(
  'runs one capped area-role diagnostic and saves only safe validation metadata', async () => {
    const input = snapshot();
    const result = await runLiveResearchComparison(input, input.clusters[0].id, {
      benchmarkApiKey: localKey('OPENROUTER_BENCHMARK_API_KEY'),
      generalApiKey: localKey('OPENROUTER_API_KEY'), mode: 'diagnostic_area',
    });
    const observedAt = new Date().toISOString();
    const filename = `RESEARCH_AREA_DIAGNOSTIC_${observedAt.replace(/[:.]/g, '-')}.json`;
    writeFileSync(resolve('outputs', filename), `${JSON.stringify({ observedAt, ...result }, null, 2)}\n`, { flag: 'wx' });
    expect(result.status).toBe('ran');
    expect(result.comparison?.total.attemptedCalls).toBe(1);
    expect(result.comparison?.attempts[0]).toMatchObject({ role: 'area', arm: 'roles' });
  }, 60_000,
);

it.skipIf(process.env.RUN_LIVE_RESEARCH_COMPARISON !== '1')(
  'runs the opt-in capped actual-agent comparison and saves a credential-free report', async () => {
    const input = snapshot();
    const result = await runLiveResearchComparison(input, input.clusters[0].id, {
      benchmarkApiKey: localKey('OPENROUTER_BENCHMARK_API_KEY'),
      generalApiKey: localKey('OPENROUTER_API_KEY'),
    });
    const observedAt = new Date().toISOString();
    const filename = `RESEARCH_COMPARISON_${observedAt.replace(/[:.]/g, '-')}.json`;
    writeFileSync(resolve('outputs', filename), `${JSON.stringify({ observedAt, ...result }, null, 2)}\n`, { flag: 'wx' });
    expect(result.status).toBe('ran');
    expect(result.comparison?.status).toBe('evaluated');
    expect(result.comparison?.automaticPositiveAcceptance).toBe(false);
    expect(result.comparison?.cases.every(item => item.baseline.decision.outcome === 'insufficient_evidence' &&
      item.roles.decision.outcome === 'insufficient_evidence')).toBe(true);
  }, 900_000,
);

it.skipIf(process.env.RUN_LIVE_RESEARCH_FOCUSED_COMPARISON !== '1')(
  'runs one capped four-case actual-agent comparison and saves a credential-free report', async () => {
    const input = snapshot();
    const result = await runLiveResearchComparison(input, input.clusters[0].id, {
      benchmarkApiKey: localKey('OPENROUTER_BENCHMARK_API_KEY'),
      generalApiKey: localKey('OPENROUTER_API_KEY'), mode: 'comparison_focused',
    });
    const observedAt = new Date().toISOString();
    const filename = `RESEARCH_FOCUSED_COMPARISON_${observedAt.replace(/[:.]/g, '-')}.json`;
    writeFileSync(resolve('outputs', filename), `${JSON.stringify({ observedAt, ...result }, null, 2)}\n`, { flag: 'wx' });
    expect(result.status).toBe('ran');
    expect(result.comparison?.total.attemptedCalls).toBeLessThanOrEqual(16);
    expect(result.comparison?.comparisonProtocol).toBe('focused_four_case');
    expect(result.comparison?.automaticPositiveAcceptance).toBe(false);
  }, 600_000,
);
