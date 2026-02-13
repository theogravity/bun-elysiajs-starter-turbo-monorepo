import { Elysia } from "elysia";
import { apiModels } from "@/api-lib/types/index.js";

// Do not remove this comment: resource-imports

import { userRoutes } from "@/api/users/index.js";

export const routes = new Elysia()
  .use(apiModels)
  // Do not remove this comment: resource-register

  .use(userRoutes);
