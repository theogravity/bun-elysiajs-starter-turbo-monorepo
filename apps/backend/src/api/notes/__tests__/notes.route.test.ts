import { BackendErrorCodes } from "@internal/backend-errors";
import { describe, expect, it } from "vitest";
import { testFramework } from "@/test-utils/test-framework/index.js";
import { testApi } from "@/test-utils/test-server.js";

describe("Notes API", () => {
  describe("authentication", () => {
    it("rejects an unauthenticated request with 401", async () => {
      const { error, status } = await testApi.notes.get({ query: { limit: 25, offset: 0 } });

      expect(status).toBe(401);
      expect((error?.value as { code?: string })?.code).toBe(BackendErrorCodes.INVALID_CREDENTIALS);
    });

    it("accepts a request carrying the session cookie", async () => {
      const { headers } = await testFramework.generateTestFacets();

      const { status } = await testApi.notes.get({ query: { limit: 25, offset: 0 }, headers });

      expect(status).toBe(200);
    });
  });

  describe("create and list", () => {
    it("creates a note owned by the signed-in user", async () => {
      const { headers } = await testFramework.generateTestFacets();

      const created = await testApi.notes.post({ title: "First", body: "Hello" }, { headers });

      expect(created.status).toBe(200);
      expect(created.data?.note.title).toBe("First");

      const listed = await testApi.notes.get({ query: { limit: 25, offset: 0 }, headers });

      expect(listed.data?.total).toBe(1);
      expect(listed.data?.notes[0]?.id).toBe(created.data?.note.id);
    });

    it("only lists the caller's own notes", async () => {
      const alice = await testFramework.generateTestFacets();
      const bob = await testFramework.generateTestFacets();

      await testApi.notes.post({ title: "Alice note", body: "x" }, { headers: alice.headers });

      const bobList = await testApi.notes.get({ query: { limit: 25, offset: 0 }, headers: bob.headers });

      expect(bobList.data?.total).toBe(0);
    });

    it("rejects an invalid body", async () => {
      const { headers } = await testFramework.generateTestFacets();

      const { status } = await testApi.notes.post({ title: "", body: "" }, { headers });

      expect(status).toBe(400);
    });
  });

  describe("ownership", () => {
    it("returns a note to its owner", async () => {
      const { headers } = await testFramework.generateTestFacets();
      const created = await testApi.notes.post({ title: "Mine", body: "b" }, { headers });
      const noteId = created.data?.note.id as string;

      const { data, status } = await testApi.notes({ noteId }).get({ headers });

      expect(status).toBe(200);
      expect(data?.note.id).toBe(noteId);
    });

    it("hides another user's note behind a 404 rather than a 403", async () => {
      const alice = await testFramework.generateTestFacets();
      const bob = await testFramework.generateTestFacets();

      const created = await testApi.notes.post({ title: "Secret", body: "b" }, { headers: alice.headers });
      const noteId = created.data?.note.id as string;

      const { error, status } = await testApi.notes({ noteId }).get({ headers: bob.headers });

      // 404, not 403 — a 403 would confirm the note exists.
      expect(status).toBe(404);
      expect((error?.value as { code?: string })?.code).toBe(BackendErrorCodes.NOT_FOUND_ERROR);
    });
  });
});
