import { Elysia } from "elysia";
import { userRoutes } from "@/api/users/index.js";
import { apiModels } from "@/schema/index.js";

export const routes = new Elysia().use(apiModels).use(userRoutes);
