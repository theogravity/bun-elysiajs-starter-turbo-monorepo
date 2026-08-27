import { BackendErrorCodes } from "@internal/backend-errors";
import { Elysia } from "elysia";
import { apiErrorBody } from "@/lib/api-error.js";
import { auth } from "@/lib/auth.js";

/**
 * Adds an `auth: true` option to a route, resolving the Better Auth session from
 * the request cookies and putting `user` and `session` on the handler context.
 *
 * A route without `auth: true` stays public.
 *
 * ```typescript
 * new Elysia().use(authPlugin).get("/mine", ({ user }) => user.id, { auth: true });
 * ```
 *
 * The 401 is returned rather than thrown so it is checked against the route's
 * `response` schema and narrowed by status for Eden clients, exactly like every
 * other expected failure. See "Error handling" in `apps/backend/AGENTS.md`.
 *
 * @see https://www.better-auth.com/docs/integrations/elysia
 */
export const authPlugin = new Elysia({ name: "auth" }).macro({
  auth: {
    async resolve({ status, request: { headers } }) {
      const session = await auth.api.getSession({ headers });

      if (!session) {
        return status(
          401,
          apiErrorBody({
            code: BackendErrorCodes.INVALID_CREDENTIALS,
            message: "Sign in to continue",
          }),
        );
      }

      return { user: session.user, session: session.session };
    },
  },
});
