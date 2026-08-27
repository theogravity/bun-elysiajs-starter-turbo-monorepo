import { onTestFinished } from "vitest";
import { logger } from "@/utils/logger.js";

/**
 * Turns server-side logging on for the current test, and back off when it ends.
 *
 * Logging is disabled globally under `IS_TEST` to keep output readable, so this is
 * how you see log lines while debugging a failing test.
 *
 * It must run **before** the request. `@loglayer/elysia` derives a child logger per
 * request, and a child created while the parent is disabled stays silent — which is
 * why enabling from inside a request lifecycle hook does not work.
 *
 * @example
 * it("does the thing", async () => {
 *   enableLoggingForTest();
 *   await testApi.notes.get({ query: { limit: 1, offset: 0 }, headers });
 * });
 */
export function enableLoggingForTest(): void {
  logger.enableLogging();

  onTestFinished(() => {
    logger.disableLogging();
  });
}
