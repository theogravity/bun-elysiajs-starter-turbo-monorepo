import { Elysia, t } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin.js";
import { contextPlugin } from "@/plugins/context.plugin.js";
import { apiModels } from "@/schema/index.js";
import { NoteSchema } from "@/schema/note.type.js";

const CreateNoteRequestSchema = t.Object({
  title: t.String({ minLength: 1, maxLength: 200, description: "Short title" }),
  body: t.String({ minLength: 1, description: "Note contents" }),
});

export type CreateNoteRequest = typeof CreateNoteRequestSchema.static;

const CreateNoteResponseSchema = t.Object({ note: NoteSchema });

export type CreateNoteResponse = typeof CreateNoteResponseSchema.static;

export const createNoteRoute = new Elysia()
  .use(contextPlugin)
  .use(authPlugin)
  .use(apiModels)
  .post(
    "/",
    async ({ body, ctx, user, log }) => {
      log?.withMetadata({ userId: user.id }).info("Creating note");

      const note = await ctx.services.notes.createNote({
        userId: user.id,
        title: body.title,
        body: body.body,
      });

      const response: CreateNoteResponse = {
        note: { id: note.id, title: note.title, body: note.body, createdAt: note.createdAt.toISOString() },
      };

      return response;
    },
    {
      auth: true,
      body: CreateNoteRequestSchema,
      response: { 200: CreateNoteResponseSchema, 400: "ApiErrorResponse", 401: "ApiErrorResponse" },
      detail: { operationId: "createNote", tags: ["note"], description: "Create a note" },
    },
  );
