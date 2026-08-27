import { Elysia } from "elysia";
import { noteRoutes } from "@/api/notes/index.js";
import { apiModels } from "@/schema/index.js";

export const routes = new Elysia().use(apiModels).use(noteRoutes);
