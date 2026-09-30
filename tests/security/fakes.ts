/**
 * A tiny stand-in for the Supabase client: every chain resolves to the data
 * configured for its table, and every write is recorded so a test can assert
 * that a rejected request never reached the database.
 */
export type Write = { table: string; op: 'insert' | 'update' | 'upsert' | 'delete'; payload?: unknown };

export function fakeSupabase(rows: Record<string, unknown> = {}) {
  const writes: Write[] = [];

  const from = (table: string) => {
    const result = { data: rows[table] ?? null, error: null };
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      order: () => builder,
      limit: () => builder,
      single: async () => result,
      maybeSingle: async () => result,
      then: (resolve: (v: unknown) => unknown) => resolve(result),
    };
    for (const op of ['insert', 'update', 'upsert', 'delete'] as const) {
      builder[op] = (payload?: unknown) => {
        writes.push({ table, op, payload });
        return builder;
      };
    }
    return builder;
  };

  return { client: { from, rpc: async () => ({ data: null, error: null }) }, writes };
}
