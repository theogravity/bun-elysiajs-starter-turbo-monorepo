import type { Selectable } from "kysely";

/**
 * Better Auth's `users` table, declared so application queries can join against it.
 *
 * **Read-only.** Better Auth owns these rows: creating, updating, and deleting users
 * goes through `auth.api.*`, which keeps password hashing, session invalidation, and
 * plugin hooks consistent. Declaring the table here is only so a repository can
 * `innerJoin` it — for example to attach an author name to a row.
 *
 * The columns are camelCase here and snake_case in Postgres, exactly like our own
 * tables: `src/lib/auth.ts` maps Better Auth's fields to snake_case so the
 * `CamelCasePlugin` translates them the same way it does everything else.
 */
export interface UsersTable {
  /** Better Auth generates a string id, not a uuid */
  id: string;
  /** Display name */
  name: string;
  /** Unique login address */
  email: string;
  /** Whether the address has been verified */
  emailVerified: boolean;
  /** Avatar URL */
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Admin plugin: `"admin"` or `"user"` */
  role: string | null;
  /** Admin plugin */
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
}

export type UserDb = Selectable<UsersTable>;
