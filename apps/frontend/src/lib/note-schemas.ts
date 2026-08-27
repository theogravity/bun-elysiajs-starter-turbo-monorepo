import { z } from "zod";

/**
 * Client-side validation for the note form, mirroring the `t` schema on
 * `POST /notes`. Immediate feedback only — the server revalidates, and
 * `applyServerErrors` surfaces its messages if the two ever diverge.
 */
export const createNoteSchema = z.object({
  title: z.string().min(1, "Give the note a title").max(200, "Keep the title under 200 characters"),
  body: z.string().min(1, "Write something"),
});

export type CreateNoteValues = z.infer<typeof createNoteSchema>;
