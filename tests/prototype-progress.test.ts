import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyProgress, createProgress } from '../prototype/research-progress.mjs';

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

describe('prototype research replay', () => {
  it('uses statuses and elapsed time from the saved checked-context roles, never a live claim', () => {
    const source = read('outputs/RESEARCH_COMPARISON_2026-10-10T08-53-09-894Z.json');
    const replay = read('prototype/research-replay.json');
    const attempts = source.comparison.attempts.filter((entry: { caseId: string; arm: string }) =>
      entry.caseId === 'checked_context' && entry.arm === 'roles');
    expect(replay.mode).toBe('replay');
    expect(replay.source).toContain('RESEARCH_COMPARISON_2026-10-10T08-53-09-894Z.json');
    expect(replay.roles).toEqual(Object.fromEntries(attempts.map((entry: { role: string; status: string }) => [entry.role, entry.status])));
    expect(replay.elapsedMs).toBeCloseTo(source.comparison.cases[0].roles.latencyMs, 0);
    expect(replay.outcome).toBe('insufficient_evidence');
    expect(replay.evaluation).toBe('unevaluated');
    let state = createProgress();
    for (const event of replay.events) state = applyProgress(state, event);
    expect(state).toMatchObject({ percent: 100, outcome: 'abstained', remainingEstimate: null });
    expect(state.stages.market).toBe('failed');
  });

  it('labels replay, role failures and no ETA in the page', () => {
    const page = readFileSync('prototype/index.html', 'utf8');
    const app = readFileSync('prototype/app.js', 'utf8');
    expect(page).toContain('id="research-progress"');
    expect(page).toMatch(/Reconstructed research replay/);
    expect(page).toMatch(/estimate not yet available/i);
    expect(app).toContain('research-replay.json');
    expect(app).not.toMatch(/agents working live/i);
  });
});
