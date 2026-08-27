import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";
import { sql } from "kysely";
import { routes } from "@/api/routes.js";
import { FRONTEND_URL } from "@/constants.js";
import { db } from "@/db/index.js";
import { auth } from "@/lib/auth.js";
import { contextPlugin } from "@/plugins/context.plugin.js";
import { errorHandlerPlugin } from "@/plugins/error-handler.plugin.js";
import { getLogger, logger } from "@/utils/logger.js";

export function createApp() {
  const app = new Elysia()
    .use(contextPlugin)
    .use(errorHandlerPlugin)
    .use(
      // Session cookies are sent cross-origin from the frontend dev server, which
      // requires an explicit origin (not `*`) and `credentials: true`. Widen
      // `origin` for additional deployed frontends.
      cors({
        origin: FRONTEND_URL,
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      }),
    )
    .use(
      openapi({
        path: "/docs",
        documentation: {
          info: {
            title: "Backend API",
            version: "1.0.0",
          },
        },
      }),
    )
    // Better Auth serves everything under /api/auth/*. It is mounted directly and
    // deliberately bypasses the route -> service -> repository layering; it owns its
    // own tables and handlers. See src/lib/auth.ts.
    .mount(auth.handler)
    .get("/", () => "OK")
    // Readiness probe. `GET /` only proves the process is up; this proves it can
    // reach the database, which is what an orchestrator should gate traffic on.
    .get(
      "/health",
      async ({ status }) => {
        try {
          await sql`select 1`.execute(db);

          return { status: "ok" as const };
        } catch (error) {
          getLogger().withError(error).error("Health check failed");

          return status(503, { status: "unavailable" as const });
        }
      },
      {
        response: {
          200: t.Object({ status: t.Literal("ok", { description: "The API can reach the database" }) }),
          503: t.Object({ status: t.Literal("unavailable", { description: "The database is unreachable" }) }),
        },
        detail: { operationId: "health", tags: ["system"], description: "Readiness probe" },
      },
    )
    .use(routes);

  return app;
}

export type App = ReturnType<typeof createApp>;

export async function startServer({ port }: { port: number }) {
  const app = createApp();

  app.listen(port, () => {
    logger.info(`Server: http://localhost:${port}`);
    logger.info(`Server docs: http://localhost:${port}/docs`);
  });

  return app;
}
