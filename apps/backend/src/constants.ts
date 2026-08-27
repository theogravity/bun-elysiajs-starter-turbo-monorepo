import { config } from "@dotenvx/dotenvx";
import { default as envVar } from "env-var";

config({
  quiet: true,
  // A missing .env is normal in tests and CI, where the variables come from the
  // environment itself. When one is genuinely missing, `required()` below reports
  // it with an actionable message — the dotenvx warning adds only noise.
  ignore: ["MISSING_ENV_FILE"],
});

const env = envVar.from(process.env, {}, () => {});

/**
 * Reads a required environment variable, failing with a message that says how to
 * fix it. Every `db:migrate:*` command loads this module, so an unhelpful error
 * here is the first thing a new contributor hits.
 */
function required(name: string): string {
  try {
    return env.get(name).required().asString();
  } catch {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        "Copy apps/backend/.env.example to apps/backend/.env, or set it in the environment.",
    );
  }
}

export const SERVER_PORT = env.get("SERVER_PORT").default("3080").asPortNumber();
export const DB_HOST = required("DB_HOST");
export const DB_PORT = env.get("DB_PORT").default("5432").asPortNumber();
export const DB_NAME = required("DB_NAME");
export const DB_USER = required("DB_USER");
export const DB_PASS = required("DB_PASS");

/** Signs session cookies. Generate with `openssl rand -base64 32`. */
export const BETTER_AUTH_SECRET = required("BETTER_AUTH_SECRET");
/** Public origin of this API, used to build auth callback URLs. */
export const BETTER_AUTH_URL = env.get("BETTER_AUTH_URL").default("http://localhost:3080").asString();
/** Origin allowed to call the API with credentials. The frontend dev server. */
export const FRONTEND_URL = env.get("FRONTEND_URL").default("http://localhost:5173").asString();

/** SMTP host. Points at smtp4dev from docker compose in development. */
export const SMTP_HOST = env.get("SMTP_HOST").default("localhost").asString();
export const SMTP_PORT = env.get("SMTP_PORT").default("2525").asPortNumber();
/** Optional SMTP credentials. smtp4dev needs none; a real provider will. */
export const SMTP_USER = env.get("SMTP_USER").default("").asString();
export const SMTP_PASS = env.get("SMTP_PASS").default("").asString();
/** Envelope From address on outbound mail. */
export const SMTP_FROM = env.get("SMTP_FROM").default("no-reply@example.com").asString();

/** Credentials for the bootstrap admin created by `bun run db:seed:run`. */
export const SEED_ADMIN_EMAIL = env.get("SEED_ADMIN_EMAIL").default("admin@example.com").asString();
export const SEED_ADMIN_PASSWORD = env.get("SEED_ADMIN_PASSWORD").default("changeme12345").asString();

export const IS_PROD = process.env.NODE_ENV === "production";
export const IS_TEST = process.env.NODE_ENV === "test";
export const BACKEND_LOG_LEVEL = env.get("BACKEND_LOG_LEVEL").default("debug").asString();
