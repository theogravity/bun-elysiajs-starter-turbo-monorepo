import type { Generated, GeneratedAlways, Insertable, Selectable, Updateable } from "kysely";

/** Database table schema for notes. */
export interface NotesTable {
  /** Unique identifier (UUID v4) */
  id: Generated<string>;
  /** Owner. References Better Auth's `"user"."id"`, which is a text id, not a uuid. */
  userId: string;
  /** Short title */
  title: string;
  /** Note contents */
  body: string;
  /** Set by the database on insert */
  createdAt: GeneratedAlways<Date>;
  /** Set by the database on insert, updated on write */
  updatedAt: Generated<Date>;
}

export type NoteDb = Selectable<NotesTable>;
export type NewNote = Insertable<NotesTable>;
export type NoteUpdate = Updateable<NotesTable>;
