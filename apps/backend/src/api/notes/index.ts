import { Elysia } from "elysia";
import { createNoteRoute } from "@/api/notes/create-note.route.js";
import { getNoteRoute } from "@/api/notes/get-note.route.js";
import { listNotesRoute } from "@/api/notes/list-notes.route.js";

export const noteRoutes = new Elysia({ prefix: "/notes" }).use(listNotesRoute).use(createNoteRoute).use(getNoteRoute);
