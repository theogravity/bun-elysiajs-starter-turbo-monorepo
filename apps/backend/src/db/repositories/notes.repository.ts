import type { DeleteResult, Kysely } from "kysely";
import { BaseRepository } from "@/db/repositories/base.repository.js";
import type { Database } from "@/db/types/index.js";
import type { NewNote, NoteDb } from "@/db/types/notes.db-types.js";

/**
 * Notes owned by a user. One repository per table; the only place queries are built.
 */
export class NotesRepository extends BaseRepository {
  async createNote({ db, note }: { db: Kysely<Database>; note: NewNote }): Promise<NoteDb> {
    return db.insertInto("notes").values(note).returningAll().executeTakeFirstOrThrow();
  }

  async getNoteById({ db, noteId }: { db: Kysely<Database>; noteId: string }): Promise<NoteDb | undefined> {
    return db.selectFrom("notes").selectAll().where("id", "=", noteId).executeTakeFirst();
  }

  /** Notes belonging to one user, newest first. */
  async listNotesByUser({
    db,
    userId,
    limit,
    offset,
  }: {
    db: Kysely<Database>;
    userId: string;
    limit: number;
    offset: number;
  }): Promise<NoteDb[]> {
    return db
      .selectFrom("notes")
      .selectAll()
      .where("userId", "=", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .offset(offset)
      .execute();
  }

  async countNotesByUser({ db, userId }: { db: Kysely<Database>; userId: string }): Promise<number> {
    const { count } = await db
      .selectFrom("notes")
      .select((eb) => eb.fn.countAll().as("count"))
      .where("userId", "=", userId)
      .executeTakeFirstOrThrow();

    return Number(count);
  }

  async deleteNoteById({ db, noteId }: { db: Kysely<Database>; noteId: string }): Promise<DeleteResult[]> {
    return db.deleteFrom("notes").where("id", "=", noteId).execute();
  }
}
