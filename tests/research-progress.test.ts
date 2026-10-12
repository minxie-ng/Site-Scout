import { describe, expect, it } from 'vitest';
import { createProgress, applyProgress, progressModeLabel } from '../prototype/research-progress.mjs';

describe('research progress contract', () => {
  it('distinguishes a connected live run from a reconstructed replay', () => {
    expect(progressModeLabel('live')).toBe('Live research run');
    expect(progressModeLabel('replay')).toBe('Reconstructed research replay');
    expect(() => progressModeLabel('unknown' as 'live')).toThrow();
  });
  it('tracks fixed stages, overlapping roles, validation and abstention without an ETA', () => {
    let state = createProgress();
    state = applyProgress(state, { stage: 'source', status: 'running', atMs: 0 });
    state = applyProgress(state, { stage: 'source', status: 'complete', atMs: 10 });
    state = applyProgress(state, { stage: 'area', status: 'running', atMs: 11 });
    state = applyProgress(state, { stage: 'market', status: 'running', atMs: 11 });
    expect(state.stages.area).toBe('running');
    expect(state.stages.market).toBe('running');
    expect(state.percent).toBe(17);
    state = applyProgress(state, { stage: 'market', status: 'failed', atMs: 20 });
    state = applyProgress(state, { stage: 'area', status: 'complete', atMs: 21 });
    state = applyProgress(state, { stage: 'challenger', status: 'running', atMs: 22 });
    state = applyProgress(state, { stage: 'challenger', status: 'complete', atMs: 23 });
    state = applyProgress(state, { stage: 'validation', status: 'running', atMs: 24 });
    state = applyProgress(state, { stage: 'validation', status: 'complete', atMs: 25 });
    state = applyProgress(state, { stage: 'result', status: 'running', atMs: 26 });
    state = applyProgress(state, { stage: 'result', status: 'abstained', atMs: 27 });
    expect(state).toMatchObject({ elapsedMs: 27, percent: 100, outcome: 'abstained', remainingEstimate: null });
  });

  it('rejects injected stages, skipped source checks and impossible transitions', () => {
    const initial = createProgress();
    expect(() => applyProgress(initial, { stage: 'result', status: 'running', atMs: 0 })).toThrow();
    expect(() => applyProgress(initial, { stage: 'send_email' as 'source', status: 'complete', atMs: 1 })).toThrow();
    expect(() => applyProgress(initial, { stage: 'area', status: 'running', atMs: 1 })).toThrow();
    expect(() => applyProgress(initial, { stage: 'source', status: 'complete', atMs: 1 })).toThrow();
    const running = applyProgress(initial, { stage: 'source', status: 'running', atMs: 1 });
    expect(() => applyProgress(running, { stage: 'source', status: 'running', atMs: 2 })).toThrow();
  });

  it.each(['failed', 'timed_out', 'cancelled', 'stale'] as const)('preserves %s as a terminal diagnostic', status => {
    let state = applyProgress(createProgress(), { stage: 'source', status: 'running', atMs: 0 });
    state = applyProgress(state, { stage: 'source', status: 'complete', atMs: 1 });
    state = applyProgress(state, { stage: 'market', status: 'running', atMs: 2 });
    state = applyProgress(state, { stage: 'market', status, atMs: 3 });
    expect(state.stages.market).toBe(status);
    expect(() => applyProgress(state, { stage: 'market', status: 'complete', atMs: 4 })).toThrow();
  });

  it('allows an early terminal failure without implying validation completed', () => {
    let state = applyProgress(createProgress(), { stage: 'source', status: 'running', atMs: 0 });
    state = applyProgress(state, { stage: 'source', status: 'failed', atMs: 1 });
    state = applyProgress(state, { stage: 'result', status: 'running', atMs: 1 });
    state = applyProgress(state, { stage: 'result', status: 'failed', atMs: 1 });
    expect(state).toMatchObject({ outcome: 'failed', percent: 33 });
    expect(() => applyProgress(state, { stage: 'area', status: 'running', atMs: 2 })).toThrow();
  });
  it('marks a bounded diagnostic unevaluated without pretending validation ran', () => {
    let state = applyProgress(createProgress(), { stage: 'source', status: 'running', atMs: 0 });
    state = applyProgress(state, { stage: 'source', status: 'complete', atMs: 1 });
    state = applyProgress(state, { stage: 'market', status: 'running', atMs: 2 });
    state = applyProgress(state, { stage: 'market', status: 'complete', atMs: 3 });
    state = applyProgress(state, { stage: 'result', status: 'running', atMs: 4 });
    state = applyProgress(state, { stage: 'result', status: 'unevaluated', atMs: 4 });
    expect(state).toMatchObject({ outcome: 'unevaluated', percent: 50, remainingEstimate: null });
    expect(state.stages.validation).toBe('pending');
  });
});
