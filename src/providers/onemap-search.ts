import { hdbTownCodes } from '../domain/islandwide-coverage';
import { loadHdbBlockLeads } from '../domain/hdb-block-leads';

type Lead = ReturnType<typeof loadHdbBlockLeads>['leads'][number];
type Plan = ReturnType<typeof planOneMapProbes>;
type ProbePlan = { maxRequests: number; probes: Lead[]; selected: null; outcome: 'insufficient_evidence' };
const endpoint = 'https://www.onemap.gov.sg/api/common/elastic/search';
const streetWords: Record<string, string> = { RD: 'ROAD', AVE: 'AVENUE', DR: 'DRIVE', ST: 'STREET', CRES: 'CRESCENT',
  CTRL: 'CENTRAL', CL: 'CLOSE', PL: 'PLACE', LOR: 'LORONG', BT: 'BUKIT', "C'WEALTH": 'COMMONWEALTH' };
const streetKey = (street: string) => street.toUpperCase().trim().split(/\s+/).map(word => streetWords[word] ?? word).join(' ');

/** One coverage probe per HDB town is a budgeted sample, never a ranked site. */
export function planOneMapProbes(inventory: ReturnType<typeof loadHdbBlockLeads>) {
  const probes = hdbTownCodes.map(code => inventory.leads.find(lead => lead.townCode === code &&
    lead.coordinateStatus === 'not_in_hdb_source'));
  if (probes.some(probe => !probe)) throw new Error('Missing unverified HDB town lead');
  return { maxRequests: 27 as const, probes: probes as Lead[], selected: null, outcome: 'insufficient_evidence' as const };
}

export function reviewOneMapSearch(lead: Lead, raw: unknown, retrievedDate: string) {
  const sourceUrl = new URL(endpoint);
  sourceUrl.searchParams.set('searchVal', `${lead.block} ${lead.street}`);
  sourceUrl.searchParams.set('returnGeom', 'Y');
  sourceUrl.searchParams.set('getAddrDetails', 'Y');
  sourceUrl.searchParams.set('pageNum', '1');
  const base = { sourceUrl: sourceUrl.toString(), retrievedDate,
    geographicScope: `${lead.block} ${lead.street}, Singapore`, outcome: 'insufficient_evidence' as const };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrievedDate) ||
    Number.isNaN(Date.parse(`${retrievedDate}T00:00:00Z`)) ||
    new Date(`${retrievedDate}T00:00:00Z`).toISOString().slice(0, 10) !== retrievedDate ||
    !raw || typeof raw !== 'object')
    return { ...base, status: 'invalid_response' as const };
  const data = raw as Record<string, unknown>;
  if ('error' in data || 'message' in data || !Array.isArray(data.results) ||
    !Number.isSafeInteger(data.found) || !Number.isSafeInteger(data.totalNumPages) || data.pageNum !== 1)
    return { ...base, status: 'invalid_response' as const };
  if ((data.totalNumPages as number) < 1 || (data.found as number) < 0 ||
    (data.totalNumPages === 1 && data.found !== data.results.length))
    return { ...base, status: 'invalid_response' as const };
  if ((data.totalNumPages as number) > 1) return { ...base, status: 'incomplete' as const };
  const matches = data.results.filter((item: unknown) => {
    if (!item || typeof item !== 'object') return false;
    const point = item as Record<string, unknown>;
    return point.BLK_NO === lead.block && typeof point.ROAD_NAME === 'string' &&
      streetKey(point.ROAD_NAME) === streetKey(lead.street);
  }) as Record<string, unknown>[];
  if (matches.length === 0) return { ...base, status: 'not_found' as const };
  const addressMatches = matches.filter(point => typeof point.POSTAL === 'string' && /^\d{6}$/.test(point.POSTAL));
  if (addressMatches.length === 0) return { ...base, status: 'invalid_response' as const };
  if (addressMatches.length > 1) return { ...base, status: 'ambiguous' as const };
  const point = addressMatches[0];
  const latitude = Number(point.LATITUDE);
  const longitude = Number(point.LONGITUDE);
  if (typeof point.LATITUDE !== 'string' || typeof point.LONGITUDE !== 'string' ||
    !/^\d{6}$/.test(String(point.POSTAL)) || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < 1.1 || latitude > 1.5 || longitude < 103.5 || longitude > 104.1)
    return { ...base, status: 'invalid_response' as const };
  // shortcut: exact address point only; residential identity and premises suitability need separate evidence.
  return { ...base, status: 'address_point' as const, coordinate: { latitude, longitude },
    evidenceStatus: 'observed_api_address' as const };
}

type Fetcher = (input: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'body' | 'headers'>>;

export function isCompleteOneMapSample(entries: readonly { status: string; httpStatus: number | null; hasRaw: boolean }[]) {
  return entries.length === 27 && entries.every(entry => entry.status === 'address_point' &&
    entry.httpStatus === 200 && entry.hasRaw);
}

async function readBoundedJson(response: Pick<Response, 'body' | 'headers'>) {
  const maxBytes = 64_000;
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBytes) throw new Error('OneMap response too large');
  if (!response.body) throw new Error('OneMap response body missing');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > maxBytes) throw new Error('OneMap response too large');
      chunks.push(next.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
}

/** Live calls require an explicit quota preflight; no retry or implicit paid usage. */
export async function runCheckedOneMapProbes<T extends ProbePlan>(plan: T, expected: T, options: { token: string; quotaConfirmed: boolean;
  fetcher?: Fetcher; retrievedDate?: string }) {
  const inventory = loadHdbBlockLeads();
  if (plan.maxRequests !== expected.probes.length || JSON.stringify(plan) !== JSON.stringify(expected) ||
    expected.probes.some(probe => !inventory.leads.some(lead => lead.townCode === probe.townCode &&
      lead.block === probe.block && lead.street === probe.street &&
      lead.publishedDwellingUnits === probe.publishedDwellingUnits &&
      lead.coordinateStatus === probe.coordinateStatus)))
    throw new Error('Invalid OneMap probe plan');
  const replay = { checkedPoints: inventory.leads.filter(lead => lead.coordinateStatus === 'checked_replay'),
    evidenceStatus: 'checked_replay' as const };
  if (!options.token) return { status: 'auth_unavailable' as const, requestsMade: 0, results: [], replay };
  if (!options.quotaConfirmed) return { status: 'quota_unverified' as const, requestsMade: 0, results: [], replay };
  const fetcher = options.fetcher ?? fetch;
  const retrievedDate = options.retrievedDate ?? new Date().toISOString().slice(0, 10);
  const results: Array<ReturnType<typeof reviewOneMapSearch> | { status: 'request_failed'; sourceUrl: string;
    retrievedDate: string; geographicScope: string; outcome: 'insufficient_evidence' }> = [];
  let requestsMade = 0;
  for (const lead of plan.probes) {
    const url = new URL(endpoint);
    url.searchParams.set('searchVal', `${lead.block} ${lead.street}`);
    url.searchParams.set('returnGeom', 'Y');
    url.searchParams.set('getAddrDetails', 'Y');
    url.searchParams.set('pageNum', '1');
    try {
      requestsMade++;
      const response = await fetcher(url.toString(), { headers: { Authorization: options.token },
        redirect: 'error', signal: AbortSignal.timeout(10_000) });
      if (response.status === 429) return { status: 'rate_limited' as const, requestsMade, results, replay };
      if (response.status === 401 || response.status === 403)
        return { status: 'auth_failed' as const, requestsMade, results, replay };
      if (!response.ok) {
        results.push({ ...reviewOneMapSearch(lead, null, retrievedDate), status: 'request_failed' });
        return { status: 'request_failed' as const, requestsMade, results, replay };
      }
      const reviewed = reviewOneMapSearch(lead, await readBoundedJson(response), retrievedDate);
      results.push(reviewed);
      if (reviewed.status !== 'address_point' && reviewed.status !== 'not_found')
        return { status: 'invalid_response' as const, requestsMade, results, replay };
    } catch {
      results.push({ ...reviewOneMapSearch(lead, null, retrievedDate), status: 'request_failed' });
      return { status: 'request_failed' as const, requestsMade, results, replay };
    }
  }
  return { status: 'complete' as const, requestsMade, results, replay };
}

export function runOneMapProbes(plan: Plan, options: { token: string; quotaConfirmed: boolean;
  fetcher?: Fetcher; retrievedDate?: string }) {
  return runCheckedOneMapProbes(plan, planOneMapProbes(loadHdbBlockLeads()), options);
}
