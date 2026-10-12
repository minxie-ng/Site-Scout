import { loadHdbBlockLeads } from '../domain/hdb-block-leads';
import { planOneMapProbes, runCheckedOneMapProbes, runOneMapProbes } from './onemap-search';

type Inventory = ReturnType<typeof loadHdbBlockLeads>;
type Lead = Inventory['leads'][number];

function blockNumber(block: string) {
  const match = /^\d+/.exec(block);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

/** Identity selection only. Street and block labels are not evidence of proximity. */
export function planSecondStageOneMapProbes(inventory: Inventory) {
  const anchors = planOneMapProbes(inventory).probes;
  const probes: Lead[] = [];
  const perTown: Array<{ townCode: string; anchorBlock: string; anchorStreet: string;
    sameStreetCount: number; fallbackCount: number }> = [];
  for (const anchor of anchors) {
    const candidates = inventory.leads.filter(lead => lead.townCode === anchor.townCode &&
      lead.coordinateStatus === 'not_in_hdb_source' &&
      !(lead.block === anchor.block && lead.street === anchor.street));
    const anchorNumber = blockNumber(anchor.block);
    candidates.sort((a, b) => Number(b.street === anchor.street) - Number(a.street === anchor.street) ||
      Math.abs(blockNumber(a.block) - anchorNumber) - Math.abs(blockNumber(b.block) - anchorNumber) ||
      a.block.localeCompare(b.block, 'en', { numeric: true }) || a.street.localeCompare(b.street));
    const pair = candidates.slice(0, 2);
    if (pair.length !== 2) throw new Error(`Insufficient second-stage HDB leads for ${anchor.townCode}`);
    probes.push(...pair);
    const sameStreetCount = pair.filter(lead => lead.street === anchor.street).length;
    perTown.push({ townCode: anchor.townCode, anchorBlock: anchor.block, anchorStreet: anchor.street,
      sameStreetCount, fallbackCount: 2 - sameStreetCount });
  }
  return { maxRequests: 54 as const, probes, perTown,
    selectionRule: 'Prefer same street as first-stage anchor; then nearest numeric block label; fallback to other streets by block label. No physical proximity inferred.',
    proximityStatus: 'unverified' as const, selected: null, outcome: 'insufficient_evidence' as const };
}

/** A no-match can be retained, but each sampled town needs at least one checked point. */
export function isUsableSecondStageCapture(entries: readonly { townCode: string; status: string;
  httpStatus: number | null; hasRaw: boolean }[]) {
  const codes = planOneMapProbes(loadHdbBlockLeads()).probes.map(probe => probe.townCode);
  return entries.length === 54 && codes.every((code, index) => {
    const pair = entries.slice(index * 2, index * 2 + 2);
    return pair.length === 2 && pair.every(entry => entry.townCode === code && entry.httpStatus === 200 &&
      entry.hasRaw && ['address_point', 'not_found'].includes(entry.status)) &&
      pair.some(entry => entry.status === 'address_point');
  });
}

/** A JWT expiry is a local preflight only; the server still decides token validity. */
export async function runSecondStageOneMapProbes(plan: ReturnType<typeof planSecondStageOneMapProbes>,
  options: Parameters<typeof runOneMapProbes>[1] & { now?: Date }) {
  const expected = planSecondStageOneMapProbes(loadHdbBlockLeads());
  // Validation must precede even authentication failures.
  const unavailable = await runCheckedOneMapProbes(plan, expected, { ...options, token: '' });
  if (!options.token) return unavailable;
  let expiresAt = 0;
  try {
    const pieces = options.token.split('.');
    if (pieces.length === 3) {
      const claim = JSON.parse(Buffer.from(pieces[1], 'base64url').toString('utf8')) as { exp?: unknown };
      if (Number.isSafeInteger(claim.exp) && Number(claim.exp) > 0) expiresAt = Number(claim.exp) * 1000;
    }
  } catch { /* Opaque or malformed tokens cannot establish expiry. */ }
  if (!expiresAt) return { ...unavailable, status: 'auth_expiry_unverified' as const };
  const now = options.now ?? new Date();
  if (!Number.isFinite(now.getTime()) || expiresAt <= now.getTime() + 5 * 60_000)
    return { ...unavailable, status: 'auth_expired' as const };
  return runCheckedOneMapProbes(plan, expected, options);
}
