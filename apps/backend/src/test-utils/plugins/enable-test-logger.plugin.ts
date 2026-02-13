import { Elysia } from "elysia";
import { logger } from "@/utils/logger.js";

export const enableTestLoggerPlugin = new Elysia({ name: "test-logger" }).onBeforeHandle(({ headers }) => {
  // Because we're running a server in a test environment, if we want to enable logging
  // we need to set a header to enable it.
  if (headers["test-logging-enabled"] === "true") {
    logger.enableLogging();
  }
});
