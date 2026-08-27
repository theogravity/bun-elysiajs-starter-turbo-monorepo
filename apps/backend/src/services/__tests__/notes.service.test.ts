import { beforeAll, describe, expect, it } from "vitest";
import { getRequestlessContext } from "@/lib/context.js";
import { testFramework } from "@/test-utils/test-framework/index.js";

/**
 * Service-level tests, driven without HTTP.
 *
 * `getRequestlessContext()` is how you reach the services outside a request — the
 * same wiring a route gets, with a logger that has no request attached. Use this
 * shape to test a business rule directly rather than through a route, which keeps
 * the assertions about the rule instead of about status codes.
 */
const { notes } = getRequestlessContext().services;

describe("NotesService", () => {
  let ownerId: string;
  let otherId: string;

  beforeAll(async () => {
    // Notes have a foreign key to Better Auth's users, so the owners must be real.
    const owner = await testFramework.generateTestFacets();
    const other = await testFramework.generateTestFacets();

    ownerId = owner.user.id;
    otherId = other.user.id;
  });

  describe("getOwnedNote", () => {
    it("returns the note to its owner", async () => {
      const created = await notes.createNote({ userId: ownerId, title: "Mine", body: "b" });

      await expect(notes.getOwnedNote({ userId: ownerId, noteId: created.id })).resolves.toMatchObject({
        id: created.id,
        title: "Mine",
      });
    });

    it("returns undefined for someone else's note", async () => {
      const created = await notes.createNote({ userId: ownerId, title: "Secret", body: "b" });

      // Undefined rather than a distinct "forbidden" result: the route turns this
      // into a 404, so a caller cannot learn that the note exists.
      await expect(notes.getOwnedNote({ userId: otherId, noteId: created.id })).resolves.toBeUndefined();
    });

    it("returns undefined for a note that does not exist", async () => {
      await expect(
        notes.getOwnedNote({ userId: ownerId, noteId: "6f1a1f4e-0000-4000-8000-000000000000" }),
      ).resolves.toBeUndefined();
    });
  });

  describe("deleteOwnedNote", () => {
    it("deletes the owner's note and reports success", async () => {
      const created = await notes.createNote({ userId: ownerId, title: "Temp", body: "b" });

      await expect(notes.deleteOwnedNote({ userId: ownerId, noteId: created.id })).resolves.toBe(true);
      await expect(notes.getOwnedNote({ userId: ownerId, noteId: created.id })).resolves.toBeUndefined();
    });

    it("refuses to delete someone else's note and leaves it in place", async () => {
      const created = await notes.createNote({ userId: ownerId, title: "Keep", body: "b" });

      await expect(notes.deleteOwnedNote({ userId: otherId, noteId: created.id })).resolves.toBe(false);
      await expect(notes.getOwnedNote({ userId: ownerId, noteId: created.id })).resolves.toBeDefined();
    });
  });

  describe("listNotes", () => {
    it("counts only the caller's notes", async () => {
      const fresh = await testFramework.generateTestFacets();

      await notes.createNote({ userId: fresh.user.id, title: "One", body: "b" });

      const { notes: page, total } = await notes.listNotes({ userId: fresh.user.id, limit: 25, offset: 0 });

      expect(total).toBe(1);
      expect(page).toHaveLength(1);
    });
  });
});
