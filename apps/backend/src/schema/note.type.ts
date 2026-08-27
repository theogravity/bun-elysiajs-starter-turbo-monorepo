import { t } from "elysia";

export const NoteSchema = t.Object({
  id: t.String({ description: "ID of the note", format: "uuid" }),
  title: t.String({ description: "Short title" }),
  body: t.String({ description: "Note contents" }),
  createdAt: t.String({ description: "ISO 8601 timestamp the note was created" }),
});

export type Note = typeof NoteSchema.static;
