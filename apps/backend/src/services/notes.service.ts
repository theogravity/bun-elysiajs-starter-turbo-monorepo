import type { NoteDb } from "@/db/types/notes.db-types.js";
import { BaseService } from "@/services/base.service.js";

export class NotesService extends BaseService {
  /** Creates a note owned by `userId`. */
  async createNote({ userId, title, body }: { userId: string; title: string; body: string }): Promise<NoteDb> {
    const note = await this.repos.notes.createNote({
      db: this.db,
      note: { userId, title, body },
    });

    this.log.withMetadata({ noteId: note.id, userId }).debug("Created note");

    return note;
  }

  /** A page of the user's own notes. */
  async listNotes({
    userId,
    limit,
    offset,
  }: {
    userId: string;
    limit: number;
    offset: number;
  }): Promise<{ notes: NoteDb[]; total: number }> {
    const [notes, total] = await Promise.all([
      this.repos.notes.listNotesByUser({ db: this.db, userId, limit, offset }),
      this.repos.notes.countNotesByUser({ db: this.db, userId }),
    ]);

    return { notes, total };
  }

  /**
   * Fetches a note the user is allowed to see.
   *
   * The ownership check lives here rather than in the route: it is a business rule,
   * and putting it in the service means every caller gets it. Returning `undefined`
   * for "not yours" rather than a distinct "forbidden" is deliberate — it avoids
   * telling a caller that someone else's note exists.
   */
  async getOwnedNote({ userId, noteId }: { userId: string; noteId: string }): Promise<NoteDb | undefined> {
    const note = await this.repos.notes.getNoteById({ db: this.db, noteId });

    if (!note || note.userId !== userId) {
      return undefined;
    }

    return note;
  }

  /** Deletes a note if the user owns it. Returns whether anything was deleted. */
  async deleteOwnedNote({ userId, noteId }: { userId: string; noteId: string }): Promise<boolean> {
    const note = await this.getOwnedNote({ userId, noteId });

    if (!note) {
      return false;
    }

    await this.repos.notes.deleteNoteById({ db: this.db, noteId });
    this.log.withMetadata({ noteId, userId }).debug("Deleted note");

    return true;
  }
}
