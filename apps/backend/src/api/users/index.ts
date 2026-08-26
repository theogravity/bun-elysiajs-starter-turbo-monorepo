import { Elysia } from "elysia";
import { createEMailUserRoute } from "@/api/users/create-email-user.route.js";
import { getUserRoute } from "@/api/users/get-user.route.js";
import { listUsersRoute } from "@/api/users/list-users.route.js";

export const userRoutes = new Elysia({ prefix: "/users" })
  .use(createEMailUserRoute)
  .use(listUsersRoute)
  .use(getUserRoute);
