import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { runOwnerInvestigation } from '../prototype/api/investigate.mjs';

it.skipIf(process.env.RUN_LIVE_OWNER_PAIRED !== '1')('measures fixed and Jev live paths on one checked group', async () => {
  const apiKey = process.env.OPENROUTER_BENCHMARK_API_KEY ?? '';
  expect(apiKey.length).toBeGreaterThan(10);
  const calls = { key: 0, jev: 0, chat: 0 };
  const guarded: typeof fetch = (input, init) => {
    const url = String(input);
    if (url === 'https://openrouter.ai/api/v1/key') calls.key++;
    else if (url === 'https://openrouter.ai/api/v1/systemone') calls.jev++;
    else if (url === 'https://openrouter.ai/api/v1/chat/completions') calls.chat++;
    else throw new Error('Unexpected provider URL');
    if (calls.key > 2 || calls.jev > 1 || calls.chat > 6) throw new Error('Call ceiling exceeded');
    return fetch(input, init);
  };
  const fixed = await runOwnerInvestigation(0, { apiKey, fetcher: guarded, mode: 'fixed' });
  const routed = await runOwnerInvestigation(0, { apiKey, fetcher: guarded, mode: 'jev' });
  expect(fixed.groupDigest).toBe(routed.groupDigest);
  expect(fixed.snapshotDate).toBe(routed.snapshotDate);
  expect(fixed.outcome).toBe('insufficient_evidence');
  expect(routed.outcome).toBe('insufficient_evidence');
  const report = { kind: 'owner_live_same_case_comparison', recordedAt: new Date().toISOString(),
    snapshotDate: fixed.snapshotDate, area: fixed.area, groupDigest: fixed.groupDigest,
    precheckedEvidenceCount: fixed.checkedEvidenceCount,
    maxRoleCallsPerArm: 3, calls,
    fixed: { status: fixed.status, elapsedMs: fixed.elapsedMs, roleCalls: fixed.roleCalls,
      roleFailures: fixed.roleFailures, knownCostUsd: fixed.knownCostUsd,
      unknownChargeCalls: fixed.unknownChargeCalls, outcome: fixed.outcome },
    routed: { status: routed.status, selectedTask: routed.selectedTask,
      routingConfidence: routed.routingConfidence, elapsedMs: routed.elapsedMs,
      roleCalls: routed.roleCalls, roleFailures: routed.roleFailures,
      knownCostUsd: routed.knownCostUsd, unknownChargeCalls: routed.unknownChargeCalls,
      outcome: routed.outcome }, speedBenefitEstablished: false };
  const path = `outputs/OWNER_LIVE_PAIRED_${report.recordedAt.replace(/[:.]/g, '-')}.json`;
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  console.info(`Credential-free owner comparison: ${path}`);
}, 60_000);
