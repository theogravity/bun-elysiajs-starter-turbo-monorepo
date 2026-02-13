import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";
import { routes } from "@/api/routes.js";
import { errorHandler } from "@/api-lib/error-handler.js";
import { contextPlugin } from "@/plugins/context.plugin.js";
import { logger } from "@/utils/logger.js";

export function createApp() {
  const app = new Elysia()
    .use(contextPlugin)
    .use(cors())
    .use(
      openapi({
        path: "/docs",
        documentation: {
          info: {
            title: "Backend API",
            version: "1.0.0",
          },
          components: {
            securitySchemes: {
              bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
              },
            },
          },
        },
      }),
    )
    .onError(errorHandler)
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
}
