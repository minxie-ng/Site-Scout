import { loadHdbBlockLeads } from '../domain/hdb-block-leads';

type Inventory = ReturnType<typeof loadHdbBlockLeads>;
type Point = { townCode: string; block: string; street: string };
type Group = { townCode: string };
const identity = (point: Point) => `${point.townCode}:${point.block}:${point.street}`;
const numericBlock = (block: string) => Number(/^\d+/.exec(block)?.[0] ?? Number.MAX_SAFE_INTEGER);

/** Text labels choose bounded probes; only returned coordinates can establish proximity. */
export function planThirdStageOneMapProbes(inventory: Inventory, checkedPoints: readonly Point[],
  groups: readonly Group[], unresolved: readonly string[]) {
  const groupedCodes = new Set(groups.map(group => group.townCode));
  const targetCodes = inventory.towns.map(town => town.code).filter(code => !groupedCodes.has(code));
  if (targetCodes.length !== 10 || new Set(targetCodes).size !== 10)
    throw new Error('Unexpected third-stage town coverage');
  const excluded = new Set([...checkedPoints.map(identity), ...unresolved]);
  const probes: Inventory['leads'] = [];
  for (const code of targetCodes) {
    const anchors = checkedPoints.filter(point => point.townCode === code);
    if (anchors.length < 2) throw new Error(`Too few checked address anchors for ${code}`);
    const candidates = inventory.leads.filter(lead => lead.townCode === code && !excluded.has(identity(lead)));
    candidates.sort((a, b) => {
      const score = (lead: Point) => Math.min(...anchors.map(anchor =>
        (anchor.street === lead.street ? 0 : 10_000) +
        Math.abs(numericBlock(anchor.block) - numericBlock(lead.block))));
      return score(a) - score(b) || a.block.localeCompare(b.block, 'en', { numeric: true }) ||
        a.street.localeCompare(b.street);
    });
    if (candidates.length < 8) throw new Error(`Too few HDB leads for ${code}`);
    probes.push(...candidates.slice(0, 8));
  }
  return { maxRequests: 80 as const, targetCodes, probes,
    selectionRule: 'Eight exact HDB identities per code without a checked triple; prefer a checked anchor street and nearby numeric block labels. Text labels do not establish physical proximity.',
    proximityStatus: 'unverified' as const, outcome: 'insufficient_evidence' as const, selected: null };
}
