// Not a generic reimplementation of the Supabase client — just enough of its chainable
// query-builder shape to test the actual logic in lib/credits.ts and lib/anonymousLimit.ts
// without hitting a real database. Each test supplies an array of responses in the exact
// order the code under test will consume them.

export interface MockResponse {
  data: unknown;
  error: unknown;
  count?: number | null;
}

export function createMockSupabase(responses: MockResponse[]) {
  let callIndex = 0;
  const updateCalls: unknown[] = [];
  const insertCalls: unknown[] = [];
  const rpcCalls: { name: string; params: unknown }[] = [];

  function nextResponse(): MockResponse {
    const response = responses[callIndex] ?? { data: null, error: null };
    callIndex++;
    return response;
  }

  function makeChainable(): Record<string, unknown> {
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      gte: () => chain,
      insert: (payload: unknown) => {
        insertCalls.push(payload);
        return chain;
      },
      update: (payload: unknown) => {
        updateCalls.push(payload);
        return chain;
      },
      single: () => Promise.resolve(nextResponse()),
      maybeSingle: () => Promise.resolve(nextResponse()),
      // Supports `await supabase.from(...).select(...).eq(...)` directly, without a
      // terminal .single()/.maybeSingle() — exactly how checkAnonymousLimit calls it.
      then: (resolve: (r: MockResponse) => void) => resolve(nextResponse()),
    };
    return chain;
  }

  return {
    from: () => makeChainable(),
    rpc: (name: string, params: unknown) => {
      rpcCalls.push({ name, params });
      return Promise.resolve(nextResponse());
    },
    callCount: () => callIndex,
    getUpdateCalls: () => updateCalls,
    getInsertCalls: () => insertCalls,
    getRpcCalls: () => rpcCalls,
  };
}
