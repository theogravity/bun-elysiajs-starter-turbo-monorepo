# Kysely migrations

Reference: https://kysely.dev/docs/migrations

```bash
bun run db:migrate:create <name>   # scaffold a new migration
bun run db:migrate:latest          # apply pending migrations
bun run db:migrate:undo            # roll back the last one
```

All three require `apps/backend/.env` to exist — even `create`, which writes no
SQL. `kysely.config.js` loads `src/db/index.ts`, which reads the `DB_*` variables
at import time, so without the file you get
`Missing required environment variable "DB_HOST"`. Copy `.env.example` first.

`create` writes `src/db/migrations/{unixMillis}_{name}.ts`, e.g.
`1787785371937_add_widgets.ts`. That is a different convention from the existing
`0001-init.ts`; leave the generated name alone rather than renaming it to match,
since Kysely orders migrations lexicographically by filename. The generated stub
is tab-indented with single quotes — run `bun run lint` after filling it in.

Migrations run automatically against the throwaway Postgres container before the
test suite, so a new migration needs no test wiring.

## Columns are snake_case

The application registers Kysely's `CamelCasePlugin` (`src/db/index.ts`), which
translates between the two naming styles at query time. Migrations are the one
place that sees the real column names:

- Migration: `given_name`, `created_at`, `user_id`
- Table interface and query builder: `givenName`, `createdAt`, `userId`

A camelCase column name in a migration will compile and then fail at runtime.

## House style

`0001-init.ts` is the reference. Follow it:

```typescript
import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("widgets")
    .addColumn("id", "uuid", (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn("owner_id", "uuid", (col) => col.notNull())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.defaultTo(sql`now()`))
    .addForeignKeyConstraint("fk_owner_id", ["owner_id"], "users", ["id"], (cb) => cb.onDelete("cascade"))
    .execute();

  await db.schema
    .createIndex("idx_widgets_owner_id")
    .on("widgets")
    .column("owner_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("idx_widgets_owner_id").execute();
  await db.schema.dropTable("widgets").execute();
}
```

- Primary keys are `uuid` defaulted to `gen_random_uuid()`
- Timestamps are `timestamptz` defaulted to `now()`
- Name foreign keys `fk_{column}` and indexes `idx_{table}_{columns}`
- `down` must undo everything `up` did, in reverse order — indexes and enum types
  included, not just the tables

## Postgres enum types

Enums are created as real Postgres types and referenced with a raw `sql` tag:

```typescript
await db.schema.createType("widget_status").asEnum(["Active", "Archived"]).execute();

await db.schema
  .createTable("widgets")
  .addColumn("status", sql`widget_status`, (col) => col.notNull())
  .execute();
```

`down` must drop the type after the tables that use it:

```typescript
await db.schema.dropTable("widgets").execute();
await db.schema.dropType("widget_status").execute();
```

Mirror the enum in TypeScript in the table's `*.db-types.ts` file and expose it to
the API through `src/schema/enums.type.ts` using
`t.String({ enum: Object.values(MyEnum) })` — not `t.Enum`, which produces poor
OpenAPI and client types.
