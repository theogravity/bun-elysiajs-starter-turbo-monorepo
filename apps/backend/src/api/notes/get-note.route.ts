import { BackendErrorCodes } from "@internal/backend-errors";
import { Elysia, t } from "elysia";
import { apiErrorBody } from "@/lib/api-error.js";
import { authPlugin } from "@/plugins/auth.plugin.js";
import { contextPlugin } from "@/plugins/context.plugin.js";
import { apiModels } from "@/schema/index.js";
import { NoteSchema } from "@/schema/note.type.js";

const GetNoteParamsSchema = t.Object({
  noteId: t.String({ format: "uuid", description: "ID of the note to fetch" }),
});

const GetNoteResponseSchema = t.Object({ note: NoteSchema });

export type GetNoteResponse = typeof GetNoteResponseSchema.static;

export const getNoteRoute = new Elysia()
  .use(contextPlugin)
  .use(authPlugin)
  .use(apiModels)
  .get(
    "/:noteId",
    async ({ params, ctx, user, status, log }) => {
      log?.withMetadata({ userId: user.id, noteId: params.noteId }).info("Fetching note");

      const note = await ctx.services.notes.getOwnedNote({ userId: user.id, noteId: params.noteId });

      // The service returns undefined both for "no such note" and "not yours", so
      // this 404 does not reveal that someone else's note exists.
      if (!note) {
        return status(
          404,
          apiErrorBody({
            code: BackendErrorCodes.NOT_FOUND_ERROR,
            message: "No note exists with that ID",
            metadataSafe: { noteId: params.noteId },
          }),
        );
      }

      const response: GetNoteResponse = {
        note: { id: note.id, title: note.title, body: note.body, createdAt: note.createdAt.toISOString() },
      };

      return response;
    },
    {
      auth: true,
      params: GetNoteParamsSchema,
      response: {
        200: GetNoteResponseSchema,
        400: "ApiErrorResponse",
        401: "ApiErrorResponse",
        404: "ApiErrorResponse",
      },
      detail: { operationId: "getNote", tags: ["note"], description: "Fetch one of the signed-in user's notes" },
    },
  );
