import { type Kysely, sql } from "kysely";

/**
 * Better Auth's core schema plus the admin plugin's columns.
 *
 * Better Auth defaults to quoted camelCase columns and a table literally named
 * `"user"`. `src/lib/auth.ts` maps every model and field to plural snake_case, so
 * these tables follow the same convention as the rest of the schema and read
 * correctly through the `CamelCasePlugin` on our Kysely instance. Keep that mapping
 * and this migration in step.
 *
 * **Do not use `@better-auth/cli generate` to regenerate this.** The published CLI
 * lags the library — 1.4.x against a 1.7.x runtime at the time of writing — and
 * emits a schema missing columns the runtime requires (`accounts.issuer`, for one).
 * That migrates cleanly and then fails on the first sign-up with
 * `column "issuer" ... does not exist`.
 *
 * Run `bun run auth:schema` instead. It reads the schema from the installed
 * `better-auth` and reports any column the database is missing. After adding or
 * removing a plugin, run it and add a *new* migration for the difference rather
 * than editing this one.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("name", "text", (col) => col.notNull())
    .addColumn("email", "text", (col) => col.notNull().unique())
    .addColumn("email_verified", "boolean", (col) => col.notNull())
    .addColumn("image", "text")
    .addColumn("created_at", "timestamptz", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.defaultTo(sql`now()`).notNull())
    // Admin plugin
    .addColumn("role", "text")
    .addColumn("banned", "boolean")
    .addColumn("ban_reason", "text")
    .addColumn("ban_expires", "timestamptz")
    .execute();

  await db.schema
    .createTable("sessions")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("token", "text", (col) => col.notNull().unique())
    .addColumn("created_at", "timestamptz", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .addColumn("ip_address", "text")
    .addColumn("user_agent", "text")
    .addColumn("user_id", "text", (col) => col.notNull())
    .addColumn("impersonated_by", "text")
    .addForeignKeyConstraint("fk_sessions_user_id", ["user_id"], "users", ["id"], (cb) => cb.onDelete("cascade"))
    .execute();

  await db.schema
    .createTable("accounts")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("issuer", "text", (col) => col.notNull())
    .addColumn("account_id", "text", (col) => col.notNull())
    .addColumn("provider_id", "text", (col) => col.notNull())
    .addColumn("user_id", "text", (col) => col.notNull())
    .addColumn("access_token", "text")
    .addColumn("refresh_token", "text")
    .addColumn("id_token", "text")
    .addColumn("access_token_expires_at", "timestamptz")
    .addColumn("refresh_token_expires_at", "timestamptz")
    .addColumn("scope", "text")
    .addColumn("password", "text")
    .addColumn("created_at", "timestamptz", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.notNull())
    .addForeignKeyConstraint("fk_accounts_user_id", ["user_id"], "users", ["id"], (cb) => cb.onDelete("cascade"))
    .execute();

  await db.schema
    .createTable("verifications")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("identifier", "text", (col) => col.notNull())
    .addColumn("value", "text", (col) => col.notNull())
    .addColumn("expires_at", "timestamptz", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn("updated_at", "timestamptz", (col) => col.defaultTo(sql`now()`).notNull())
    .execute();

  await db.schema.createIndex("idx_sessions_user_id").on("sessions").column("user_id").execute();
  await db.schema.createIndex("idx_accounts_user_id").on("accounts").column("user_id").execute();
  await db.schema.createIndex("idx_verifications_identifier").on("verifications").column("identifier").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("idx_verifications_identifier").execute();
  await db.schema.dropIndex("idx_accounts_user_id").execute();
  await db.schema.dropIndex("idx_sessions_user_id").execute();
  await db.schema.dropTable("verifications").execute();
  await db.schema.dropTable("accounts").execute();
  await db.schema.dropTable("sessions").execute();
  await db.schema.dropTable("users").execute();
}
