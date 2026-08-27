import { type ChildProcess, execFile, spawn } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, type StartedTestContainer, Wait } from "testcontainers";
import { BACKEND_URL, FRONTEND_URL, PORTS } from "./ports";

const run = promisify(execFile);

const ROOT = path.join(import.meta.dirname, "..");
const BACKEND_DIR = path.join(ROOT, "apps", "backend");
const FRONTEND_DIR = path.join(ROOT, "apps", "frontend");

const DB_ENV = {
  DB_HOST: "localhost",
  DB_PORT: String(PORTS.postgres),
  DB_NAME: "e2e",
  DB_USER: "e2e",
  DB_PASS: "e2e",
  BETTER_AUTH_SECRET: "e2e-secret-not-used-outside-tests-00000",
};

interface Stack {
  postgres: StartedPostgreSqlContainer;
  smtp: StartedTestContainer;
  processes: ChildProcess[];
}

declare global {
  var e2eStack: Stack | undefined;
}

/** Polls a URL until it answers, so we start tests only once the stack is live. */
async function waitForUrl(url: string, label: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Not listening yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`[e2e] ${label} did not become ready at ${url} within ${timeoutMs}ms`);
}

/**
 * Spawns a long-running server.
 *
 * `detached` puts it in its own process group so teardown can kill the whole tree.
 * `bun run` and `vite` both fork children, and killing only the parent leaves the
 * real server holding its port — which makes the next run fail with a port clash
 * rather than a useful error.
 */
function startServer(command: string[], cwd: string, env: NodeJS.ProcessEnv): ChildProcess {
  const child = spawn(command[0] as string, command.slice(1), {
    cwd,
    detached: true,
    stdio: process.env.E2E_VERBOSE ? "inherit" : "ignore",
    env: { ...process.env, ...env },
  });

  child.unref();

  return child;
}

/**
 * Brings up everything the tests need: Postgres, smtp4dev, the API, and the web app.
 *
 * This deliberately does **not** use Playwright's `webServer`. Playwright starts
 * those before running `globalSetup`, so the API would boot against a database that
 * does not exist yet; and it re-evaluates the config in every worker, so starting
 * containers at config scope races on fixed ports. `globalSetup` runs exactly once,
 * in one process, which is what this needs.
 */
export async function startStack(): Promise<void> {
  console.log("[e2e] starting postgres and smtp4dev");

  const [postgres, smtp] = await Promise.all([
    new PostgreSqlContainer("postgres:16")
      .withDatabase("e2e")
      .withUsername("e2e")
      .withPassword("e2e")
      .withExposedPorts({ container: 5432, host: PORTS.postgres })
      .start(),
    new GenericContainer("rnwood/smtp4dev:v3")
      .withExposedPorts({ container: 80, host: PORTS.smtpWeb }, { container: 25, host: PORTS.smtp })
      .withWaitStrategy(Wait.forHttp("/api/messages", 80))
      .start(),
  ]);

  console.log("[e2e] running migrations");

  // Shells out to the real migration command rather than reimplementing it, so the
  // e2e database is built exactly the way a developer's is.
  await run("bun", ["run", "db:migrate:latest"], { cwd: BACKEND_DIR, env: { ...process.env, ...DB_ENV } });

  console.log("[e2e] starting the api and the web app");

  const processes = [
    startServer(["bun", "run", "./src/index.ts"], BACKEND_DIR, {
      ...DB_ENV,
      SERVER_PORT: String(PORTS.backend),
      BETTER_AUTH_URL: BACKEND_URL,
      FRONTEND_URL,
      SMTP_HOST: "localhost",
      SMTP_PORT: String(PORTS.smtp),
      SMTP_FROM: "no-reply@e2e.test",
      BACKEND_LOG_LEVEL: "warn",
    }),
    startServer(["bun", "run", "vite", "--port", String(PORTS.frontend), "--strictPort"], FRONTEND_DIR, {
      VITE_API_URL: BACKEND_URL,
    }),
  ];

  globalThis.e2eStack = { postgres, smtp, processes };

  await Promise.all([waitForUrl(`${BACKEND_URL}/health`, "api"), waitForUrl(FRONTEND_URL, "web app")]);

  console.log("[e2e] stack ready");
}

/** Stops the servers and containers `startStack` began. */
export async function stopStack(): Promise<void> {
  const stack = globalThis.e2eStack;

  if (!stack) {
    return;
  }

  for (const child of stack.processes) {
    try {
      // Negative pid targets the whole process group, killing forked children too.
      if (child.pid) {
        process.kill(-child.pid, "SIGTERM");
      }
    } catch {
      // Already gone.
    }
  }

  await Promise.all([stack.postgres.stop(), stack.smtp.stop()]);

  globalThis.e2eStack = undefined;
}
