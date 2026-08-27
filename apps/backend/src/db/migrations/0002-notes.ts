import { type Kysely, sql } from "kysely";

/**
 * Example application table, owned by this app rather than by Better Auth.
 *
 * It exists to show how domain data hangs off an authenticated user, with a foreign
 * key into Better Auth's `users` table. Replace it with your own domain.
 */
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("notes")
    .addColumn("id", "uuid", (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull())
    .addColumn("title", "varchar(200)", (col) => col.notNull())
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (col) => col.defaultTo(sql`now()`))
    // References Better Auth's users table. Its id is `text`, not a uuid, because
    // Better Auth generates its own string ids.
    .addForeignKeyConstraint("fk_notes_user_id", ["user_id"], "users", ["id"], (cb) => cb.onDelete("cascade"))
    .execute();

  await db.schema.createIndex("idx_notes_user_id").on("notes").column("user_id").execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex("idx_notes_user_id").execute();
  await db.schema.dropTable("notes").execute();
}
