export type LiveEvent = { stage: 'source' | 'route' | 'area' | 'market' | 'challenger' | 'result'; status: 'working' | 'done' | 'failed' | 'degraded'; [key: string]: unknown };
export type LiveResult = { status: 'jev_routed' | 'fixed' | 'degraded'; selectedTask: 'area' | 'market' | 'challenger' | null; routingConfidence: number | null; area: string; blocks: string[]; snapshotDate: string; groupDigest: string; outcome: 'insufficient_evidence'; checkedEvidenceCount: number; roleCalls: number; roleFailures: number; knownCostUsd: number; unknownChargeCalls: number; elapsedMs: number; nextStep: string };
export function runOwnerInvestigation(index: number, options?: { apiKey?: string; fetcher?: typeof fetch; emit?: (event: LiveEvent) => void; mode?: 'jev' | 'fixed'; expectedGroupDigest?: string }): Promise<LiveResult>;
declare const handler: (request: any, response: any) => Promise<void>;
export default handler;
