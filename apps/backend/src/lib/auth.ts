import { type BetterAuthOptions, betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL, FRONTEND_URL } from "@/constants.js";
import { pgPool } from "@/db/index.js";

/**
 * Better Auth owns authentication end to end: the `user`, `session`, `account`, and
 * `verification` tables, password hashing, session cookies, and every route under
 * `/api/auth/*`.
 *
 * It is deliberately outside the route → service → repository layering. Its handler
 * is mounted directly in `src/server.ts` and it talks to Postgres through its own
 * adapter, sharing our `pgPool`. Do not write repositories for its tables or call
 * them from a service — go through `auth.api.*`, which keeps sessions, hooks, and
 * plugin behaviour consistent. See "Authentication" in `apps/backend/AGENTS.md`.
 */
export const authOptions = {
  // Shares the application pool rather than opening a second one.
  database: pgPool,

  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,

  // The browser sends the session cookie cross-origin, so the frontend origin has
  // to be trusted explicitly. CORS is configured to match in `src/server.ts`.
  trustedOrigins: [FRONTEND_URL],

  emailAndPassword: {
    enabled: true,
  },

  // Rate limiting is Better Auth's own and is on in production only. Behind a proxy
  // it cannot resolve a client IP on its own and falls back to one shared bucket
  // per path, which limits nobody in particular. Set the header your proxy is known
  // to overwrite before deploying — a client can forge `x-forwarded-for` otherwise:
  //
  //   advanced: { ipAddress: { ipAddressHeaders: ["x-real-ip"] } }
  //
  // See https://www.better-auth.com/docs/concepts/rate-limit

  // Better Auth defaults to quoted camelCase columns and a table literally named
  // "user". Mapped here to plural snake_case so its tables follow the same
  // convention as the rest of the schema and stay readable through the
  // CamelCasePlugin on our Kysely instance. The built-in Kysely adapter has no
  // global casing switch — only the Drizzle adapter does — so every multi-word
  // field is listed explicitly. Add a mapping here whenever a plugin adds a field.
  user: {
    modelName: "users",
    fields: {
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  session: {
    modelName: "sessions",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      userId: "user_id",
    },
  },

  account: {
    modelName: "accounts",
    fields: {
      accountId: "account_id",
      providerId: "provider_id",
      userId: "user_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  verification: {
    modelName: "verifications",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },

  plugins: [
    // Adds `role`, `banned`, `ban_reason`, `ban_expires` to users and
    // `impersonated_by` to sessions, plus the admin endpoints the /admin page uses.
    // A plugin's own fields are mapped through its `schema` option, not the
    // top-level `user`/`session` maps, which only know the core fields.
    admin({
      schema: {
        user: {
          fields: {
            banReason: "ban_reason",
            banExpires: "ban_expires",
          },
        },
        session: {
          fields: {
            impersonatedBy: "impersonated_by",
          },
        },
      },
    }),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth(authOptions);

/** The session and user shape resolved from a request. */
export type AuthSession = typeof auth.$Infer.Session;
