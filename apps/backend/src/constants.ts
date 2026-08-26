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

export const IS_PROD = process.env.NODE_ENV === "production";
export const IS_TEST = process.env.NODE_ENV === "test";
export const BACKEND_LOG_LEVEL = env.get("BACKEND_LOG_LEVEL").default("debug").asString();
