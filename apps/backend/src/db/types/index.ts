import type { UsersTable } from "@/db/types/auth.db-types.js";
import type { NotesTable } from "@/db/types/notes.db-types.js";

/**
 * Tables reachable through the Kysely instance in `src/db/index.ts`.
 *
 * `users` is Better Auth's, declared so application queries can join against it.
 * Treat it as read-only — see `auth.db-types.ts`. Better Auth's other tables
 * (`sessions`, `accounts`, `verifications`) are deliberately absent: nothing in the
 * application should be reading them.
 */
export interface Database {
  notes: NotesTable;
  users: UsersTable;
}
