import { describe, expect, it } from "vitest";
import { createNote, listNotes, NOTES_PAGE_SIZE, noteKeys, notesListQuery } from "@/api/notes";
import { BackendRequestError } from "@/lib/api";
import { stubFetch } from "@/test-utils/fetch";

const emptyPage = { notes: [], total: 0 };

describe("notes api", () => {
  describe("listNotes", () => {
    it("requests GET /notes with the default page size", async () => {
      const captured = stubFetch(emptyPage);

      await listNotes();

      expect(captured[0]?.method).toBe("GET");
      expect(captured[0]?.url.pathname).toBe("/notes");
      expect(captured[0]?.url.searchParams.get("limit")).toBe(String(NOTES_PAGE_SIZE));
      expect(captured[0]?.url.searchParams.get("offset")).toBe("0");
    });

    it("sends credentials so the session cookie is included", async () => {
      const captured = stubFetch(emptyPage);

      await listNotes();

      expect(captured[0]?.credentials).toBe("include");
    });

    it("rejects with the backend error code when unauthenticated", async () => {
      stubFetch({ errId: "e", code: "INVALID_CREDENTIALS", message: "Sign in", statusCode: 401 }, { status: 401 });

      await expect(listNotes()).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", status: 401 });
      await expect(listNotes()).rejects.toBeInstanceOf(BackendRequestError);
    });
  });

  describe("createNote", () => {
    it("posts the body to /notes", async () => {
      const captured = stubFetch({ note: { id: "n1", title: "t", body: "b", createdAt: "2026-01-01T00:00:00.000Z" } });

      await createNote({ title: "t", body: "b" });

      expect(captured[0]?.method).toBe("POST");
      expect(captured[0]?.url.pathname).toBe("/notes");
      expect(captured[0]?.json()).toMatchObject({ title: "t", body: "b" });
    });
  });

  describe("query keys", () => {
    it("builds the same key regardless of how defaults are supplied", () => {
      expect(notesListQuery().queryKey).toEqual(notesListQuery({ offset: 0 }).queryKey);
    });

    it("nests under a common prefix for invalidation", () => {
      expect(notesListQuery().queryKey.slice(0, 1)).toEqual(noteKeys.all);
    });
  });
});
