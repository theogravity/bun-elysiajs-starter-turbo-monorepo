import { SERVER_PORT } from "@/constants.js";
import { closeDatabase } from "@/db/index.js";
import { closeMailer } from "@/lib/mailer.js";
import { startServer } from "@/server.js";
import { getLogger } from "@/utils/logger.js";

export type { App } from "@/server.js";

process.on("unhandledRejection", (reason, promise) => {
  const log = getLogger().withPrefix("[Unhandled Rejection]");
  log
    .withError(reason)
    .withMetadata({
      promise,
    })
    .fatal("Unhandled Rejection");
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  const log = getLogger().withPrefix("[Uncaught Exception]");
  log.withError(error).fatal("Uncaught Exception");
  process.exit(1);
});

(async () => {
  const app = await startServer({ port: SERVER_PORT });

  /**
   * Graceful shutdown. A container runtime sends SIGTERM and then kills the process
   * shortly after, so stop accepting connections and close the pool rather than
   * letting in-flight queries and their connections be dropped.
   */
  const shutdown = async (signal: string) => {
    const log = getLogger().withPrefix("[Shutdown]");

    log.withMetadata({ signal }).info("Shutting down");

    try {
      await app.stop();
      closeMailer();
      await closeDatabase();
      log.info("Shutdown complete");
      process.exit(0);
    } catch (error) {
      log.withError(error).error("Shutdown failed");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
})();
