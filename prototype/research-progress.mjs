export const progressStages = Object.freeze(['source', 'area', 'market', 'challenger', 'validation', 'result']);
export function progressModeLabel(mode) {
  if (mode === 'live') return 'Live research run';
  if (mode === 'replay') return 'Reconstructed research replay';
  throw new Error('Invalid research mode');
}
const terminal = new Set(['complete', 'failed', 'timed_out', 'cancelled', 'stale', 'abstained', 'unevaluated']);

export function createProgress() {
  return { stages: Object.fromEntries(progressStages.map(stage => [stage, 'pending'])), elapsedMs: 0,
    percent: 0, outcome: null, remainingEstimate: null };
}

export function applyProgress(previous, event) {
  if (!progressStages.includes(event?.stage) || !['running', ...terminal].includes(event.status) ||
    !Number.isFinite(event.atMs) || event.atMs < previous.elapsedMs || event.atMs < 0) throw new Error('Invalid progress event');
  const current = previous.stages[event.stage];
  if (previous.outcome !== null) throw new Error('Run already ended');
  if (event.stage === 'result' && !terminal.has(previous.stages.source)) throw new Error('Source check not terminal');
  if (!['source', 'result'].includes(event.stage) && previous.stages.source !== 'complete') throw new Error('Source check incomplete');
  if (event.stage === 'validation' && ['area', 'market', 'challenger'].some(stage => !terminal.has(previous.stages[stage]))) throw new Error('Roles incomplete');
  if (event.status === 'unevaluated' && event.stage !== 'result') throw new Error('Invalid diagnostic outcome');
  if (event.stage === 'result' && previous.stages.validation !== 'complete' &&
    !['running', 'failed', 'timed_out', 'cancelled', 'unevaluated'].includes(event.status)) throw new Error('Validation incomplete');
  if (current === 'pending' ? event.status !== 'running' : current !== 'running' || event.status === 'running') throw new Error('Invalid stage transition');
  if (event.status === 'abstained' && event.stage !== 'result') throw new Error('Invalid abstention');
  const stages = { ...previous.stages, [event.stage]: event.status };
  return { stages, elapsedMs: event.atMs, percent: Math.round(progressStages.filter(stage => terminal.has(stages[stage])).length / progressStages.length * 100),
    outcome: event.stage === 'result' && event.status !== 'running' ? event.status : previous.outcome, remainingEstimate: null };
}
