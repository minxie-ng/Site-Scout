import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { requestLiveInvestigation } from '../prototype/live-investigation.mjs';

it('sends only the selected checked group and reports actual streamed stage events', async () => {
  const events: unknown[] = [];
  const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    expect(JSON.parse(init?.body as string)).toEqual({ index: 2, groupDigest: 'a'.repeat(64) });
    expect((init?.headers as Record<string, string>)['X-Site-Scout-Demo-Code']).toBe('demo-code');
    return new Response(['{"type":"progress","stage":"source","status":"done"}',
      '{"type":"progress","stage":"route","status":"working"}',
      '{"type":"result","status":"jev_routed","selectedTask":"market","outcome":"insufficient_evidence","roleCalls":3,"knownCostUsd":0.0001,"elapsedMs":420}'].join('\n') + '\n');
  });
  const result = await requestLiveInvestigation(2, { fetcher, groupDigest: 'a'.repeat(64),
    accessCode: 'demo-code', onEvent: event => events.push(event) });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(events).toHaveLength(2);
  expect(result).toMatchObject({ status: 'jev_routed', outcome: 'insufficient_evidence', roleCalls: 3 });
});

it('rejects unsupported indexes and malformed or positive server results', async () => {
  const fetcher = vi.fn(async () => new Response('{"type":"result","outcome":"go"}\n'));
  await expect(requestLiveInvestigation(4, { fetcher, groupDigest: 'a'.repeat(64),
    accessCode: 'demo-code' })).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
  await expect(requestLiveInvestigation(0, { fetcher, groupDigest: 'a'.repeat(64),
    accessCode: 'demo-code' })).rejects.toThrow();
});

it('offers a separate live progress surface in the owner journey', () => {
  const html = readFileSync('prototype/index.html', 'utf8');
  expect(html).toContain('id="run-live-investigation"');
  expect(html).toContain('id="live-access-code"');
  expect(html).toContain('id="live-investigation-progress"');
  expect(html).toContain('id="live-investigation-status"');
});
