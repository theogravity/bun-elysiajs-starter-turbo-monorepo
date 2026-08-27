import type { Kysely } from "kysely";
import { sql } from "kysely";
import { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } from "@/constants.js";
import type { Database } from "@/db/types/index.js";
import { auth } from "@/lib/auth.js";
import { getRequestlessContext } from "@/lib/context.js";

/**
 * Creates the first admin user.
 *
 * Better Auth's admin endpoints require an existing admin, so the first one cannot
 * be made through the API. This is the bootstrap: sign the user up through Better
 * Auth — so the password is hashed and the account row is created exactly as a real
 * sign-up would — then set the role directly.
 *
 * ```bash
 * bun run db:seed:run
 * ```
 *
 * Idempotent: running it again on an existing email only re-applies the role.
 * Override the credentials with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
 */
export async function seed(db: Kysely<Database>): Promise<void> {
  // Work outside a request goes through the requestless context, which gives the
  // same services a route would use, with a logger that has no request attached.
  const log = getRequestlessContext().log;

  const existing = await db
    .selectFrom("users")
    .select(["id", "role"])
    .where("email", "=", SEED_ADMIN_EMAIL)
    .executeTakeFirst();

  if (!existing) {
    const response = await auth.api.signUpEmail({
      body: {
        email: SEED_ADMIN_EMAIL,
        password: SEED_ADMIN_PASSWORD,
        name: "Admin",
      },
    });

    log.withMetadata({ userId: response.user.id, email: SEED_ADMIN_EMAIL }).info("Created seed admin user");
  }

  await sql`update users set role = 'admin' where email = ${SEED_ADMIN_EMAIL}`.execute(db);

  log.withMetadata({ email: SEED_ADMIN_EMAIL }).info("Seed admin user promoted");
}
