import { createHash } from 'node:crypto';

const endpoint = 'https://public-onemap-gateway-hoaiixjtvz.gateway.bedrock-agentcore.ap-southeast-1.amazonaws.com/mcp';
const protocolVersion = '2025-06-18';
const supportedVersions = [protocolVersion, '2025-03-26'];
type SearchCall = { name: 'address___search'; arguments: { searchVal: string; returnGeom: 'Y';
  getAddrDetails: 'Y'; pageNum: 1 } };
type NearbyCall = { name: 'nearby___mrt_stations' | 'nearby___bus_stops'; arguments: {
  latitude: number; longitude: number; radius_in_meters: number } };
export type OneMapMcpCall = SearchCall | NearbyCall;
type Options = { accessToken: string; accessTokenExpiresAt: number; clock?: () => Date;
  fetcher?: typeof fetch };
type Failure = 'auth_unavailable' | 'auth_expired' | 'rate_limited' | 'auth_failed' |
  'request_failed' | 'invalid_response' | 'unsupported_protocol' | 'tool_error';

function validCall(call: OneMapMcpCall) {
  if (!call || typeof call !== 'object' || !call.arguments || typeof call.arguments !== 'object') return false;
  const args = call.arguments as unknown as Record<string, unknown>;
  if (call.name === 'address___search') return Object.keys(args).sort().join(',') ===
    'getAddrDetails,pageNum,returnGeom,searchVal' && typeof args.searchVal === 'string' &&
    /^[A-Za-z0-9 .'-]{3,120}$/.test(args.searchVal) && args.returnGeom === 'Y' &&
    args.getAddrDetails === 'Y' && args.pageNum === 1;
  if (call.name !== 'nearby___mrt_stations' && call.name !== 'nearby___bus_stops') return false;
  return Object.keys(args).sort().join(',') === 'latitude,longitude,radius_in_meters' &&
    typeof args.latitude === 'number' && typeof args.longitude === 'number' &&
    args.latitude >= 1.1 && args.latitude <= 1.5 && args.longitude >= 103.5 &&
    args.longitude <= 104.1 && Number.isSafeInteger(args.radius_in_meters) &&
    Number(args.radius_in_meters) >= 100 && Number(args.radius_in_meters) <= 1000;
}

async function readBounded(response: Response) {
  if (!response.body) throw new Error('Missing MCP body');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 64_000) throw new Error('MCP body too large');
      chunks.push(part.value);
    }
  } finally { try { void reader.cancel().catch(() => undefined); } catch { /* already closed */ } }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function decodeReply(raw: string, contentType: string, id: number) {
  let messages: unknown[];
  if (contentType.startsWith('application/json')) messages = [JSON.parse(raw)];
  else if (contentType.startsWith('text/event-stream')) messages = raw.split(/\r?\n\r?\n/).flatMap(event => {
    const data = event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
    return data ? [JSON.parse(data) as unknown] : [];
  });
  else throw new Error('Unsupported MCP response type');
  const matches = messages.filter(message => message && typeof message === 'object' &&
    (message as Record<string, unknown>).id === id &&
    (message as Record<string, unknown>).jsonrpc === '2.0') as Record<string, unknown>[];
  if (matches.length !== 1) throw new Error('Missing or duplicate MCP response');
  return matches[0];
}

/** Bounded, read-only MCP context. Tool content remains untrusted research data. */
export async function runBoundedOneMapMcp(calls: readonly OneMapMcpCall[], options: Options) {
  if (!Array.isArray(calls) || calls.length < 1 || calls.length > 3 || calls.some(call => !validCall(call)))
    throw new Error('Invalid OneMap MCP call');
  let requestsMade = 0;
  const results: Array<{ name: OneMapMcpCall['name']; sourceUrl: string; documentationUrl: string;
    retrievedAt: string; geographicScope: string; evidenceStatus: 'research_only_unverified';
    rawSha256: string; rawResponse: string; content: unknown; structuredContent: unknown }> = [];
  const finish = (status: 'complete' | Failure) => ({ status, requestsMade, results,
    selected: null, outcome: 'insufficient_evidence' as const });
  if (!options.accessToken) return finish('auth_unavailable');
  const clock = options.clock ?? (() => new Date());
  const now = clock();
  if (!Number.isFinite(now.getTime()) || !Number.isSafeInteger(options.accessTokenExpiresAt) ||
    options.accessTokenExpiresAt * 1000 <= now.getTime() + 60_000) return finish('auth_expired');
  const fetcher = options.fetcher ?? fetch;
  let negotiatedVersion = protocolVersion;
  const send = async (message: object, id: number | null, session?: string) => {
    requestsMade++;
    const headers: Record<string, string> = { Authorization: `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
    if (session) { headers['Mcp-Session-Id'] = session; headers['MCP-Protocol-Version'] = negotiatedVersion; }
    else if (id === null || id > 1) headers['MCP-Protocol-Version'] = negotiatedVersion;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('MCP deadline')); }, 5_000);
    });
    const request = async () => {
      const response = await fetcher(endpoint, { method: 'POST', headers,
        body: JSON.stringify(message), redirect: 'error', signal: controller.signal });
      if (response.status === 429) return { status: 'rate_limited' as const };
      if (response.status === 401 || response.status === 403) return { status: 'auth_failed' as const };
      if (id === null) return { status: response.status === 202 ? 'ok' as const : 'invalid_response' as const };
      if (!response.ok) return { status: 'request_failed' as const };
      const raw = await readBounded(response);
      if (raw.includes(options.accessToken)) return { status: 'invalid_response' as const };
      const envelope = decodeReply(raw, response.headers.get('content-type') ?? '', id);
      return { status: 'ok' as const, envelope, raw, response };
    };
    try { return await Promise.race([request(), deadline]); }
    catch { return { status: 'request_failed' as const }; }
    finally { if (timer) clearTimeout(timer); }
  };
  const initialized = await send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
    protocolVersion, capabilities: {}, clientInfo: { name: 'site-scout', version: '0.1.0' } } }, 1);
  if (initialized.status !== 'ok') return finish(initialized.status);
  const init = initialized.envelope?.result;
  if (!init || typeof init !== 'object' ||
    !supportedVersions.includes(String((init as Record<string, unknown>).protocolVersion)) ||
    !(init as Record<string, unknown>).capabilities ||
    typeof (init as { capabilities?: { tools?: unknown } }).capabilities?.tools !== 'object')
    return finish('unsupported_protocol');
  negotiatedVersion = (init as { protocolVersion: string }).protocolVersion;
  const session = initialized.response?.headers.get('Mcp-Session-Id') ?? undefined;
  if (session && !/^[\x21-\x7E]{1,256}$/.test(session)) return finish('invalid_response');
  const notice = await send({ jsonrpc: '2.0', method: 'notifications/initialized' }, null, session);
  if (notice.status !== 'ok') return finish(notice.status);
  for (const [index, call] of calls.entries()) {
    const reply = await send({ jsonrpc: '2.0', id: index + 2, method: 'tools/call',
      params: { name: call.name, arguments: call.arguments } }, index + 2, session);
    if (reply.status !== 'ok') return finish(reply.status);
    if (reply.envelope?.error) return finish('tool_error');
    const result = reply.envelope?.result;
    if (!result || typeof result !== 'object' || (result as Record<string, unknown>).isError === true)
      return finish('tool_error');
    const content = (result as Record<string, unknown>).content;
    const structuredContent = (result as Record<string, unknown>).structuredContent;
    if (!Array.isArray(content) && (!structuredContent || typeof structuredContent !== 'object'))
      return finish('invalid_response');
    const retrievedAt = clock().toISOString();
    const geographicScope = call.name === 'address___search'
      ? `${call.arguments.searchVal}, Singapore`
      : `within ${call.arguments.radius_in_meters} m of WGS84 ${call.arguments.latitude},${call.arguments.longitude}, Singapore`;
    results.push({ name: call.name, sourceUrl: endpoint,
      documentationUrl: 'https://www.onemap.gov.sg/apidocs/mcp', retrievedAt, geographicScope,
      evidenceStatus: 'research_only_unverified',
      rawSha256: createHash('sha256').update(reply.raw!).digest('hex'), rawResponse: reply.raw!,
      content: content ?? null, structuredContent: structuredContent ?? null });
  }
  return finish('complete');
}
