export type ProgressStage = 'source' | 'area' | 'market' | 'challenger' | 'validation' | 'result';
export type ProgressStatus = 'pending' | 'running' | 'complete' | 'failed' | 'timed_out' | 'cancelled' | 'stale' | 'abstained' | 'unevaluated';
export type ProgressEvent = { stage: ProgressStage; status: Exclude<ProgressStatus, 'pending'>; atMs: number };
export type ProgressState = { stages: Record<ProgressStage, ProgressStatus>; elapsedMs: number; percent: number; outcome: ProgressStatus | null; remainingEstimate: null };
export const progressStages: readonly ProgressStage[];
export function progressModeLabel(mode: 'live' | 'replay'): string;
export function createProgress(): ProgressState;
export function applyProgress(previous: ProgressState, event: ProgressEvent): ProgressState;
