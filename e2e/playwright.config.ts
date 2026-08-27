import { defineConfig, devices } from "@playwright/test";
import { FRONTEND_URL } from "./ports";


/**
 * End-to-end tests: a real browser against the real frontend, the real API, a real
 * Postgres, and a real SMTP server.
 *
 * `globalSetup` owns the whole stack — containers, migrations, and both servers.
 * Playwright's own `webServer` is not used: it starts before `globalSetup`, so the
 * API would boot without a database. See the note in `stack.ts`.
 *
 * Not part of `turbo test` — it needs Docker and a browser download. Run it with
 * `bun run test:e2e` from the repo root.
 */
export default defineConfig({
  testDir: "./tests",
  globalSetup: "./global-setup.ts",
  globalTeardown: "./global-teardown.ts",
  // Each spec signs up its own user, so they are independent — but they share one
  // database, so keep the file count low rather than fighting over Postgres.
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: FRONTEND_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

});
