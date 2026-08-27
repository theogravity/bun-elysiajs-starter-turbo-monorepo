import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { API_URL } from "@/lib/api";

/**
 * Better Auth browser client.
 *
 * Talks to the handler mounted at `/api/auth/*` on the backend. Sessions are
 * cookie-based, so every request must send credentials — the backend's CORS is
 * configured with `credentials: true` and an explicit origin to match.
 *
 * `adminClient()` mirrors the server's `admin()` plugin and adds
 * `authClient.admin.*` (listUsers, setRole, banUser, ...), used by `/admin/users`.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [adminClient()],
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signUp, signOut, useSession } = authClient;

/** The signed-in user, as Better Auth models it. */
export type SessionUser = NonNullable<ReturnType<typeof useSession>["data"]>["user"];
