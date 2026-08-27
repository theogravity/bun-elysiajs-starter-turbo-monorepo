import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { routes } from "@/api/routes.js";
import { FRONTEND_URL } from "@/constants.js";
import { auth } from "@/lib/auth.js";
import { contextPlugin } from "@/plugins/context.plugin.js";
import { errorHandlerPlugin } from "@/plugins/error-handler.plugin.js";
import { logger } from "@/utils/logger.js";

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
