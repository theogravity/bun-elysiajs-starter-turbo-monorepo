/**
 * Preloaded once per `bun test` run — see `bunfig.toml`.
 *
 * Bun runs every test file in a single process, so this module is evaluated once
 * before the first file and its top-level `await` blocks collection until the
 * container is up and migrated. The `afterAll` registered here is global: hooks
 * declared in a preload apply to the whole run, so it fires after the last file.
 *
 * That is why there is no separate teardown module. The container and pool stay in
 * module scope rather than on `globalThis`.
 */

import { afterAll } from "bun:test";
import * as path from "node:path";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { Kysely, PostgresDialect } from "kysely";
import { Migrator } from "kysely/migration";
import { Pool } from "pg";
import { TypeScriptFileMigrationProvider } from "@/test-utils/ts-migration-transpiler.js";

process.on("unhandledRejection", (reason) => {
  console.error("[Unhandled Rejection]");
  console.error(reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("[Uncaught Exception]");
  console.error(error);
  process.exit(1);
});

// Better Auth requires a secret at import time. Tests do not read `.env` — and CI
// has none — so inject a throwaway one, the same way the database variables below
// are injected from the container.
process.env.BETTER_AUTH_SECRET ??= "test-secret-not-used-outside-tests-000000";

console.log("Starting postgres container");

const container: StartedPostgreSqlContainer = await new PostgreSqlContainer("postgres:16").start();

process.env.DB_HOST = container.getHost();
process.env.DB_PORT = container.getPort().toString();
process.env.DB_USER = container.getUsername();
process.env.DB_PASS = container.getPassword();
process.env.DB_NAME = container.getDatabase();

const pool = new Pool({
  host: "localhost",
  port: container.getPort(),
  user: container.getUsername(),
  password: container.getPassword(),
  database: container.getDatabase(),
});

const migrator = new Migrator({
  db: new Kysely({ dialect: new PostgresDialect({ pool }) }),
  provider: new TypeScriptFileMigrationProvider(path.join(__dirname, "..", "db", "migrations")),
});

console.log("Migrating database");

const { error } = await migrator.migrateToLatest();

if (error) {
  console.error("failed to migrate");
  console.error(error);
  process.exit(1);
}

afterAll(async () => {
  await pool.end();
  await container.stop({ timeout: 10000 });
});
