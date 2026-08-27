/**
 * Fixed host ports for the end-to-end stack.
 *
 * Deliberately not random. Playwright evaluates `webServer.env` when the config
 * loads, before `globalSetup` runs, so the container ports have to be knowable up
 * front. They are offset well away from the normal development ports so an e2e run
 * cannot collide with a running `turbo watch dev` — or with an unrelated project's
 * database, which 5432 frequently is.
 */
export const PORTS = {
  postgres: 55432,
  smtpWeb: 55001,
  smtp: 52525,
  backend: 3099,
  frontend: 5199,
} as const;

export const BACKEND_URL = `http://localhost:${PORTS.backend}`;
export const FRONTEND_URL = `http://localhost:${PORTS.frontend}`;
export const SMTP_WEB_URL = `http://localhost:${PORTS.smtpWeb}`;
