import { Elysia } from "elysia";
import { createEMailUserRoute } from "@/api/users/create-email-user.route.js";

// Do not remove this comment: route-imports

export const userRoutes = new Elysia({ prefix: "/users" })
  // Do not remove this comment: route-register
  .use(createEMailUserRoute);
