import { getSimplePrettyTerminal } from "@loglayer/transport-simple-pretty-terminal";
import { type ILogLayer, LogLayer } from "loglayer";

const transport = getSimplePrettyTerminal({ runtime: "browser" });

export const logger = new LogLayer({
  transport,
  contextFieldName: "context",
  metadataFieldName: "metadata",
  errorFieldName: "err",
});

// Keep test output readable. Mirrors the backend, which disables logging when
// IS_TEST. Call `logger.enableLogging()` inside a test that needs to see output.
if (import.meta.env.MODE === "test") {
  logger.disableLogging();
}

/**
 * Returns the singleton logger instance.
 *
 * Prefer structured metadata over interpolated strings —
 * `getLogger().withMetadata({ userId }).info("Fetched user")` rather than
 * `` info(`Fetched user ${userId}`) `` — so fields stay queryable.
 */
export function getLogger(): ILogLayer {
  return logger;
}
