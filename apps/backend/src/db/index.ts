import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import { DB_HOST, DB_NAME, DB_PASS, DB_PORT, DB_USER } from "@/constants.js";
import type { Database } from "@/db/types/index.js";

/**
 * The Postgres connection pool.
 *
 * Exported because Better Auth takes the pool directly (`src/lib/auth.ts`) and
 * shares it rather than opening a second one. It is also what `closeDatabase()`
 * shuts down on SIGTERM.
 */
export const pgPool = new pg.Pool({
  database: DB_NAME,
  host: DB_HOST,
  user: DB_USER,
  port: DB_PORT,
  password: DB_PASS,
});

export const kyselyDialect = new PostgresDialect({ pool: pgPool });

export const kyselyPlugins = [new CamelCasePlugin()];

export const db = new Kysely<Database>({
  dialect: kyselyDialect,
  plugins: kyselyPlugins,
});

/**
 * Closes the pool. Called during graceful shutdown so in-flight queries finish and
 * connections are released instead of being dropped by the runtime.
 */
export async function closeDatabase(): Promise<void> {
  await db.destroy();
}
