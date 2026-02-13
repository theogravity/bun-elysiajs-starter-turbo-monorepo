import { elysiaLogLayer } from "@loglayer/elysia";
import { Elysia } from "elysia";
import type { LogLayer } from "loglayer";
import { nanoid } from "nanoid";
import { ApiContext } from "@/api-lib/context.js";
import { db } from "@/db/index.js";
import { logger } from "@/utils/logger.js";

export const contextPlugin = new Elysia({ name: "context" })
  .use(
    elysiaLogLayer({
      instance: logger,
      requestId: () => nanoid(12),
    }),
  )
  .resolve(({ log }) => ({
    ctx: new ApiContext({
      db,
      log: log as unknown as LogLayer,
    }),
  }))
  .as("global");
