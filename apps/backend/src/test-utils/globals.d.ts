import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Pool } from "pg";

/**
 * Globals shared between the Vitest global setup and teardown.
 *
 * Vitest runs `global-setup.ts` and `global-teardown.ts` in the same process but as
 * separate modules, so the started containers and the pg pool are handed between
 * them on `globalThis`.
 */
declare global {
  /** Testcontainers instances started for the run, stopped during teardown. */
  var containers: StartedPostgreSqlContainer[];
  /** Pool used to apply migrations, closed during teardown. */
  var dbPool: Pool | null;
}
