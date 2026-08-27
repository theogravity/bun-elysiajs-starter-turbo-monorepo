import { queryOptions } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";

/**
 * Every call to the `/notes` endpoints. Routes and components import from here
 * rather than reaching for the Eden client directly — see `apps/frontend/AGENTS.md`.
 *
 * These endpoints require a session. The browser sends the Better Auth cookie
 * automatically because the client is configured with `credentials: "include"`.
 */

export const NOTES_PAGE_SIZE = 25;

export interface ListNotesParams {
  limit?: number;
  offset?: number;
}

function withDefaults(params: ListNotesParams = {}): Required<ListNotesParams> {
  return { limit: params.limit ?? NOTES_PAGE_SIZE, offset: params.offset ?? 0 };
}

/** `GET /notes` — the signed-in user's notes. */
export function listNotes(params: ListNotesParams = {}) {
  return unwrap(api.notes.get({ query: withDefaults(params), fetch: { credentials: "include" } }));
}

/** `GET /notes/:noteId` */
export function getNote(noteId: string) {
  return unwrap(api.notes({ noteId }).get({ fetch: { credentials: "include" } }));
}

export interface CreateNoteInput {
  title: string;
  body: string;
}

/** `POST /notes` */
export function createNote(input: CreateNoteInput) {
  return unwrap(api.notes.post(input, { fetch: { credentials: "include" } }));
}

export type NoteList = Awaited<ReturnType<typeof listNotes>>;
export type Note = NoteList["notes"][number];

export const noteKeys = {
  all: ["notes"] as const,
  lists: () => [...noteKeys.all, "list"] as const,
  list: (params: Required<ListNotesParams>) => [...noteKeys.lists(), params] as const,
  detail: (noteId: string) => [...noteKeys.all, "detail", noteId] as const,
};

export function notesListQuery(params: ListNotesParams = {}) {
  const resolved = withDefaults(params);

  return queryOptions({
    queryKey: noteKeys.list(resolved),
    queryFn: () => listNotes(resolved),
  });
}
