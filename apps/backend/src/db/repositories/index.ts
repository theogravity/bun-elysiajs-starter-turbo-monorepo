import type { NotesRepository } from "@/db/repositories/notes.repository.js";

export interface Repositories {
  notes: NotesRepository;
}
