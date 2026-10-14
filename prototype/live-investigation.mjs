const stages = new Set(['source', 'route', 'area', 'market', 'challenger', 'result']);
const statuses = new Set(['working', 'done', 'failed', 'degraded']);

/** The API streams completed work; this client never advances stages on a timer. */
export async function requestLiveInvestigation(index, { groupDigest, accessCode, fetcher = fetch,
  onEvent = () => {}, signal } = {}) {
  if (!Number.isInteger(index) || index < 0 || index > 2) throw new Error('Invalid selected area');
  if (typeof groupDigest !== 'string' || !/^[a-f0-9]{64}$/.test(groupDigest) ||
    typeof accessCode !== 'string' || accessCode.length < 8 || accessCode.length > 64)
    throw new Error('Invalid demo access');
  const response = await fetcher('/api/investigate', { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Site-Scout-Demo-Code': accessCode },
    body: JSON.stringify({ index, groupDigest }), signal });
  if (response.status === 403) throw new Error('Demo access code required or invalid');
  if (!response.ok || !response.body) throw new Error('Live investigation unavailable');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 32_768) throw new Error('Investigation response too large');
      buffer += decoder.decode(part.value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        const event = JSON.parse(line);
        if (event.type === 'progress' && stages.has(event.stage) && statuses.has(event.status) && !result) {
          onEvent(event);
        } else if (event.type === 'result' && !result && event.outcome === 'insufficient_evidence' &&
          ['jev_routed', 'fixed', 'degraded'].includes(event.status) &&
          Number.isInteger(event.roleCalls) && event.roleCalls >= 0 && event.roleCalls <= 3 &&
          Number.isFinite(event.elapsedMs) && event.elapsedMs >= 0 &&
          (event.knownCostUsd === null || Number.isFinite(event.knownCostUsd) && event.knownCostUsd >= 0)) {
          result = event;
        } else throw new Error('Invalid investigation response');
      }
    }
    if (buffer.trim() || !result) throw new Error('Incomplete investigation response');
    return result;
  } finally { reader.releaseLock(); }
}
