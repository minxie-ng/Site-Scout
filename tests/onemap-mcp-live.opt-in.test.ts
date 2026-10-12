import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { runBoundedOneMapMcp } from '../src/providers/onemap-mcp';

it.skipIf(process.env.RUN_ONEMAP_MCP_CANARY !== '1')('captures one bounded official MCP address response', async () => {
  process.loadEnvFile('.env.local');
  const accessToken = process.env.ONEMAP_MCP_ACCESS_TOKEN ?? '';
  const accessTokenExpiresAt = Number(process.env.ONEMAP_MCP_EXPIRES_AT);
  expect(accessToken.length).toBeGreaterThan(20);
  expect(Number.isSafeInteger(accessTokenExpiresAt)).toBe(true);
  const run = await runBoundedOneMapMcp([{ name: 'address___search', arguments: {
    searchVal: '442A NEW PUNGGOL ROAD', returnGeom: 'Y', getAddrDetails: 'Y', pageNum: 1,
  } }], { accessToken, accessTokenExpiresAt });
  expect(run.requestsMade).toBeLessThanOrEqual(3);
  expect(run.outcome).toBe('insufficient_evidence');
  expect(run.status).toBe('complete');
  expect(run.results).toHaveLength(1);
  const result = run.results[0];
  expect(result.evidenceStatus).toBe('research_only_unverified');
  const directory = `src/data/snapshots/${result.retrievedAt.slice(0, 10)}/original`;
  mkdirSync(directory, { recursive: true });
  writeFileSync(`${directory}/onemap-mcp-canary.json`, result.rawResponse, { flag: 'wx' });
  writeFileSync(`${directory}/onemap-mcp-canary-manifest.json`, JSON.stringify({
    status: run.status, requestsMade: run.requestsMade, outcome: run.outcome,
    selected: run.selected, sourceUrl: result.sourceUrl, documentationUrl: result.documentationUrl,
    retrievedAt: result.retrievedAt, geographicScope: result.geographicScope,
    evidenceStatus: result.evidenceStatus, sha256: result.rawSha256,
    rawPath: `${directory}/onemap-mcp-canary.json`, tool: result.name,
    reviewStatus: 'unreviewed',
  }, null, 2) + '\n', { flag: 'wx' });
});
