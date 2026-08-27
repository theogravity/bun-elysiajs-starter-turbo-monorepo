import { getSchema } from "better-auth/db";
import { sql } from "kysely";
import { closeDatabase, db } from "@/db/index.js";
import { authOptions } from "@/lib/auth.js";

/**
 * Compares what the installed Better Auth expects against what the database has.
 *
 * Run it after changing Better Auth plugins or upgrading the library:
 *
 * ```bash
 * bun run auth:schema
 * ```
 *
 * This exists because `@better-auth/cli generate` is published separately from the
 * library and lags it. A stale CLI emits a schema that migrates cleanly and then
 * fails at runtime on the first sign-up. Reading the schema from the installed
 * package cannot drift that way.
 *
 * Exits non-zero when a column is missing, so it can gate a deploy.
 */
interface ColumnRow {
  tableName: string;
  columnName: string;
}

const schema = getSchema(authOptions as never) as Record<
  string,
  { modelName?: string; fields: Record<string, unknown> }
>;

// Aliased to camelCase on purpose: `db` has the CamelCasePlugin, which rewrites
// result keys, so selecting bare `table_name` would arrive as `tableName` anyway.
// Naming it explicitly makes the query honest about what comes back.
const { rows } = await sql<ColumnRow>`
  select table_name as "tableName", column_name as "columnName"
  from information_schema.columns
  where table_schema = 'public'
`.execute(db);

const actual = new Map<string, Set<string>>();
for (const row of rows) {
  const columns = actual.get(row.tableName) ?? new Set<string>();
  columns.add(row.columnName);
  actual.set(row.tableName, columns);
}

let missing = 0;

for (const [model, definition] of Object.entries(schema)) {
  const table = definition.modelName ?? model;
  const columns = actual.get(table);

  if (!columns) {
    console.error(`MISSING TABLE  ${table}`);
    missing += 1;
    continue;
  }

  // Better Auth always has an `id`; the rest come from the field definitions.
  for (const field of ["id", ...Object.keys(definition.fields)]) {
    if (!columns.has(field)) {
      console.error(`MISSING COLUMN ${table}.${field}`);
      missing += 1;
    }
  }
}

await closeDatabase();

if (missing > 0) {
  console.error(`\n${missing} difference(s). Add a migration for them.`);
  process.exit(1);
}

console.log("Database matches the schema better-auth expects.");
