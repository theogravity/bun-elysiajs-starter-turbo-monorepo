import { Elysia, t } from "elysia";
import { authPlugin } from "@/plugins/auth.plugin.js";
import { contextPlugin } from "@/plugins/context.plugin.js";
import { apiModels } from "@/schema/index.js";
import { NoteSchema } from "@/schema/note.type.js";

const ListNotesQuerySchema = t.Object({
  limit: t.Optional(t.Number({ default: 25, minimum: 1, maximum: 100, description: "Maximum notes to return" })),
  offset: t.Optional(t.Number({ default: 0, minimum: 0, description: "Notes to skip, for pagination" })),
});

const ListNotesResponseSchema = t.Object({
  notes: t.Array(NoteSchema, { description: "The signed-in user's notes, newest first" }),
  total: t.Number({ description: "Total notes owned by the user" }),
});

export type ListNotesResponse = typeof ListNotesResponseSchema.static;

export const listNotesRoute = new Elysia()
  .use(contextPlugin)
  .use(authPlugin)
  .use(apiModels)
  .get(
    "/",
    async ({ query, ctx, user, log }) => {
      const limit = query.limit ?? 25;
      const offset = query.offset ?? 0;

      log?.withMetadata({ userId: user.id, limit, offset }).info("Listing notes");

      // `user` comes from the session, never from the request body — a caller
      // cannot ask for someone else's notes.
      const { notes, total } = await ctx.services.notes.listNotes({ userId: user.id, limit, offset });

      const response: ListNotesResponse = {
        notes: notes.map((note) => ({
          id: note.id,
          title: note.title,
          body: note.body,
          createdAt: note.createdAt.toISOString(),
        })),
        total,
      };

      return response;
    },
    {
      auth: true,
      query: ListNotesQuerySchema,
      response: { 200: ListNotesResponseSchema, 400: "ApiErrorResponse", 401: "ApiErrorResponse" },
      detail: { operationId: "listNotes", tags: ["note"], description: "List the signed-in user's notes" },
    },
  );
