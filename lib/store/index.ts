import postgres from "postgres";
import { createMemoryStore } from "./memory";
import { createPostgresStore, type SqlRunner } from "./postgres";
import type { Store } from "./types";

export * from "./types";
export { newId, newPrizeCode, normalizeCode } from "./ids";
export { createMemoryStore } from "./memory";
export { createPostgresStore, SCHEMA, type SqlRunner } from "./postgres";

/**
 * Escolhe onde os dados ficam:
 *  - `memory` (padrão): em RAM, some ao reiniciar. Bom para desenvolver.
 *  - `postgres`: DATABASE_URL apontando para Neon, Supabase, Railway, Render
 *    ou qualquer Postgres. É o que vale para a festa.
 */
const globalStore = globalThis as unknown as {
  __girouStore?: Store;
  __girouMigrated?: Promise<void>;
};

/** Liga a interface mínima do store à biblioteca `postgres`. */
function postgresRunner(url: string): SqlRunner {
  const sql = postgres(url, {
    // Pooler de serverless (Neon, Supabase) não aceita prepared statements.
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX || 5),
    idle_timeout: 20,
    connect_timeout: 10,
  });

  type Tx = postgres.TransactionSql<Record<string, never>>;

  // Dentro de uma transação o `postgres` troca begin por savepoint; o store
  // usa um nível só, mas tipar os dois deixa o aninhamento correto de graça.
  const wrapTx = (tx: Tx): SqlRunner => ({
    async query(text, params = []) {
      return tx.unsafe(text, params as never[]) as never;
    },
    async transaction(fn) {
      return tx.savepoint((sp: Tx) => fn(wrapTx(sp))) as never;
    },
  });

  return {
    async query(text, params = []) {
      return sql.unsafe(text, params as never[]) as never;
    },
    async transaction(fn) {
      return sql.begin((tx: Tx) => fn(wrapTx(tx))) as never;
    },
  };
}

export function getStore(): Store {
  if (globalStore.__girouStore) return globalStore.__girouStore;

  const driver = process.env.STORAGE_DRIVER || "memory";

  if (driver === "postgres") {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "STORAGE_DRIVER=postgres exige DATABASE_URL. Pegue a connection string no painel do seu banco.",
      );
    }
    const store = createPostgresStore(postgresRunner(url));
    // Cria as tabelas na primeira vez, uma vez só por processo.
    globalStore.__girouMigrated ??= store.migrate();
    globalStore.__girouStore = {
      ...store,
      // Toda operação espera a migração antes de tocar no banco.
      ...Object.fromEntries(
        Object.entries(store).map(([nome, fn]) => [
          nome,
          async (...args: unknown[]) => {
            await globalStore.__girouMigrated;
            return (fn as (...a: unknown[]) => unknown)(...args);
          },
        ]),
      ),
    } as Store;
    return globalStore.__girouStore;
  }

  if (driver !== "memory") {
    throw new Error(
      `STORAGE_DRIVER inválido: "${driver}". Use memory ou postgres.`,
    );
  }

  globalStore.__girouStore = createMemoryStore();
  return globalStore.__girouStore;
}
