import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { runJevRoutedResearch, compareJevResearchRouting } from '../src/providers/jev-task-routing';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const input = () => ({
  clusters: ['block-cluster.json', 'punggol-sapphire-cluster.json', 'punggol-ripples-cluster.json']
    .map(name => read(`src/data/snapshots/2026-10-06/${name}`)),
  competitorLeads: read('src/data/snapshots/2026-10-06/competitor-leads.json'),
  development: read('src/data/snapshots/2026-10-05/developments.json'),
  factorFeed: read('prototype/data.json'),
});
const roles = () => ({ area: vi.fn(async () => ({ claims: [], conflicts: [], unknowns: ['Area unknown.'], nextInvestigation: 'Check area.' })),
  market: vi.fn(async () => ({ claims: [], conflicts: [], unknowns: ['Market unknown.'], nextInvestigation: 'Check market.' })),
  challenger: vi.fn(async () => ({ claims: [], conflicts: [], unknowns: ['Premises unknown.'], nextInvestigation: 'Check premises.' })) });
const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) =>
  String(url).endsWith('/key') ? new Response(JSON.stringify({ data: { limit: 0.1, limit_remaining: 0.09,
    usage: 0.01, limit_reset: null } })) : new Response(JSON.stringify({ model: 'typesafe/jev-1.13-20260917',
    usage: { cost: 0.00001 }, answers: { research_priority: { type: 'choice', choice: 'market', confidence: 0.9,
      probabilities: { area: 0.05, market: 0.9, challenger: 0.05 } } } })));

it('routes the checked three-role workflow through actual Jev Decisions transport without changing abstention', async () => {
  const snapshot = input(); const runners = roles(); const network = vi.fn(fetcher) as unknown as typeof fetch;
  const result = await runJevRoutedResearch(snapshot, snapshot.clusters[0].id, runners,
    { benchmarkApiKey: 'dedicated', generalApiKey: 'general', fetcher: network });
  expect(result).toMatchObject({ status: 'jev_routed', selectedTask: 'market',
    routingConfidence: 0.9, degradedReason: null,
    kind: 'bounded_routing_demonstration',
    decision: { outcome: 'insufficient_evidence' }, reportedCostUsd: 0.00001, callsUsed: 3 });
  expect(Object.values(runners).every(run => run.mock.calls.length === 1)).toBe(true);
  expect(network).toHaveBeenCalledTimes(2);
  const request = JSON.parse(String((network as any).mock.calls[1][1].body));
  expect(request.questions.research_priority.type).toBe('choice');
  expect(Object.keys(request.questions.research_priority.criteria)).toEqual(['area', 'market', 'challenger']);
  expect(request.state).not.toHaveProperty('sourceText');
});

it('executes the Jev-prioritized task before starting the remaining bounded roles', async () => {
  const snapshot = input(); const started: string[] = [];
  let releaseMarket!: () => void;
  const marketGate = new Promise<void>(resolve => { releaseMarket = resolve; });
  const output = { claims: [], conflicts: [], unknowns: ['Unknown.'], nextInvestigation: 'Check facts.' };
  const runners = { area: vi.fn(async () => { started.push('area'); return output; }),
    market: vi.fn(async () => { started.push('market'); await marketGate; return output; }),
    challenger: vi.fn(async () => { started.push('challenger'); return output; }) };
  const pending = runJevRoutedResearch(snapshot, snapshot.clusters[0].id, runners,
    { benchmarkApiKey: 'dedicated', generalApiKey: 'general', fetcher: vi.fn(fetcher) as unknown as typeof fetch });
  await vi.waitFor(() => expect(started).toContain('market'));
  expect(started).toEqual(['market']);
  releaseMarket();
  await pending;
  expect(started).toEqual(['market', 'area', 'challenger']);
});

it('routes from a bounded case-specific checked evidence-gap summary', async () => {
  const snapshot = input(); const bodies: any[] = [];
  const network = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url).endsWith('/systemone')) bodies.push(JSON.parse(String(init?.body)));
    return fetcher(url, init);
  }) as unknown as typeof fetch;
  await runJevRoutedResearch(snapshot, snapshot.clusters[0].id, roles(),
    { benchmarkApiKey: 'dedicated', generalApiKey: 'general', fetcher: network });
  await runJevRoutedResearch(snapshot, snapshot.clusters[1].id, roles(),
    { benchmarkApiKey: 'dedicated', generalApiKey: 'general', fetcher: network });
  expect(bodies).toHaveLength(2);
  expect(bodies[0].state.clusterId).toBe(snapshot.clusters[0].id);
  expect(bodies[1].state.clusterId).toBe(snapshot.clusters[1].id);
  expect(bodies[0].state.publishedDwellingUnits).not.toBe(bodies[1].state.publishedDwellingUnits);
  expect(bodies[0].state.missingLocalEvidence).toContain('rent');
  expect(JSON.stringify(bodies)).not.toContain('sourceText');
});

it('fails closed on invalid source before any provider or role call', async () => {
  const snapshot = input(); snapshot.development.sources[0].sourceUrl = 'https://example.com/wrong';
  const runners = roles(); const network = vi.fn(fetcher) as unknown as typeof fetch;
  const result = await runJevRoutedResearch(snapshot, snapshot.clusters[0].id, runners,
    { benchmarkApiKey: 'dedicated', generalApiKey: 'general', fetcher: network });
  expect(result.status).toBe('invalid_source');
  expect(network).not.toHaveBeenCalled();
  expect(Object.values(runners).every(run => run.mock.calls.length === 0)).toBe(true);
});

it('discloses a degraded abstaining run when Jev cannot select an allowed task', async () => {
  const snapshot = input(); const runners = roles();
  const network = vi.fn(async (url: string | URL | Request) => String(url).endsWith('/key') ?
    new Response(JSON.stringify({ data: { limit: 0.1, limit_remaining: 0.09, usage: 0.01, limit_reset: null } })) :
    new Response(JSON.stringify({ model: 'typesafe/jev-1.13-20260917', usage: { cost: 0.00001 },
      answers: { research_priority: { type: 'choice', choice: 'rent', confidence: 0.9,
        probabilities: { area: 0.05, market: 0.9, challenger: 0.05 } } } }))) as unknown as typeof fetch;
  const result = await runJevRoutedResearch(snapshot, snapshot.clusters[0].id, runners,
    { benchmarkApiKey: 'dedicated', generalApiKey: 'general', fetcher: network });
  expect(result).toMatchObject({ status: 'degraded', selectedTask: null,
    degradedReason: 'invalid_answer',
    decision: { outcome: 'insufficient_evidence' } });
});

it('uses a valid low-confidence Choice only to order work while all roles still run', async () => {
  const snapshot = input();
  const network = vi.fn(async (url: string | URL | Request) => String(url).endsWith('/key') ?
    new Response(JSON.stringify({ data: { limit: 0.1, limit_remaining: 0.09, usage: 0.01, limit_reset: null } })) :
    new Response(JSON.stringify({ model: 'typesafe/jev-1.13-20260917', usage: { cost: 0.00001 },
      answers: { research_priority: { type: 'choice', choice: 'area', confidence: 0.7,
        probabilities: { area: 0.7, market: 0.2, challenger: 0.1 } } } }))) as unknown as typeof fetch;
  const runners = roles();
  const result = await runJevRoutedResearch(snapshot, snapshot.clusters[0].id, runners,
    { benchmarkApiKey: 'dedicated', generalApiKey: 'general', fetcher: network });
  expect(result).toMatchObject({ status: 'jev_routed', selectedTask: 'area',
    routingConfidence: 0.7, degradedReason: null, reportedCostUsd: 0.00001,
    decision: { outcome: 'insufficient_evidence' } });
  expect(network).toHaveBeenCalledTimes(2);
  expect(Object.values(runners).every(run => run.mock.calls.length === 1)).toBe(true);
});

it('uses fixed bounded research with explicit degraded status when the Jev key is unavailable', async () => {
  const snapshot = input(); const runners = roles(); const network = vi.fn(fetcher) as unknown as typeof fetch;
  const result = await runJevRoutedResearch(snapshot, snapshot.clusters[0].id, runners,
    { benchmarkApiKey: '', generalApiKey: 'general', fetcher: network });
  expect(result).toMatchObject({ status: 'degraded', selectedTask: null, callsUsed: 3,
    degradedReason: 'missing_key', reportedCostUsd: 0, decision: { outcome: 'insufficient_evidence' } });
  expect(network).not.toHaveBeenCalled();
});

it('withholds routing when the account cap fails and never sends a Decisions request', async () => {
  const snapshot = input(); const network = vi.fn(async () => new Response(JSON.stringify({ data: {
    limit: 0.2, limit_remaining: 0.2, usage: 0, limit_reset: null } }))) as unknown as typeof fetch;
  const result = await runJevRoutedResearch(snapshot, snapshot.clusters[0].id, roles(),
    { benchmarkApiKey: 'dedicated', generalApiKey: 'general', fetcher: network });
  expect(result).toMatchObject({ status: 'degraded', selectedTask: null, reportedCostUsd: 0 });
  expect(network).toHaveBeenCalledOnce();
});

it('compares complete fixed and routed paths on the same case and three-call role ceiling', async () => {
  const snapshot = input(); const result = await compareJevResearchRouting(snapshot, snapshot.clusters[0].id,
    () => roles(), { benchmarkApiKey: 'dedicated', generalApiKey: 'general', fetcher: vi.fn(fetcher) as unknown as typeof fetch });
  expect(result).toMatchObject({ sameCaseAndEvidence: true, maxRoleCallsPerArm: 3,
    kind: 'bounded_routing_demonstration',
    fixed: { callsUsed: 3, decision: { outcome: 'insufficient_evidence' } },
    routed: { callsUsed: 3, decision: { outcome: 'insufficient_evidence' } }, speedBenefitEstablished: false });
});
