import { Elysia } from "elysia";
import { ApiErrorResponseSchema } from "@/schema/error.type.js";
import { NoteSchema } from "@/schema/note.type.js";

export const apiModels = new Elysia({ name: "api-models" }).model({
  ApiErrorResponse: ApiErrorResponseSchema,
  Note: NoteSchema,
});
