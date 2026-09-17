import { PGlite } from "@electric-sql/pglite";
import { createPostgresStore, type SqlRunner } from "../../lib/store/postgres.ts";
import type { Store } from "../../lib/store/types.ts";

/**
 * Postgres de verdade dentro do processo de teste (PGlite é o Postgres
 * compilado em WebAssembly). O SQL exercitado aqui é exatamente o mesmo que
 * vai rodar no Neon, no Supabase ou no Railway.
 */
export async function createPgliteStore(): Promise<
  Store & { close(): Promise<void> }
> {
  const db = new PGlite();

  const runner: SqlRunner = {
    async query(text, params = []) {
      const result = await db.query(text, params as never[]);
      return result.rows as never;
    },
  };

  const store = createPostgresStore(runner);
  await store.migrate();

  return Object.assign(store, {
    async close() {
      await db.close();
    },
  });
}
