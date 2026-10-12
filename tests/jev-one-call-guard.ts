/** Opt-in experiment guard: block any second Jev request before fetch. */
export function singleJevRequestFetcher(network: typeof fetch) {
  let requests = 0;
  const fetcher: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (url === 'https://openrouter.ai/api/v1/systemone' && method === 'POST') {
      if (requests >= 1) throw new Error('One Jev request limit');
      requests += 1;
    } else if (url !== 'https://openrouter.ai/api/v1/key' || method !== 'GET') {
      throw new Error('Unapproved Jev replay endpoint');
    }
    return network(input, init);
  };
  return { fetcher, getJevRequestCount: () => requests };
}
