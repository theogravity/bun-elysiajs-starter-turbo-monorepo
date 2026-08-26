import { Elysia } from "elysia";
import { createEMailUserRoute } from "@/api/users/create-email-user.route.js";

export const userRoutes = new Elysia({ prefix: "/users" }).use(createEMailUserRoute);
