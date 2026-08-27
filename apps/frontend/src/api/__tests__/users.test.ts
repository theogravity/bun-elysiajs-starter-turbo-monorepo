import { afterEach, describe, expect, it, vi } from "vitest";
import { createEMailUser, getUser, listUsers, USERS_PAGE_SIZE, userKeys, usersListQuery } from "@/api/users";
import { BackendRequestError } from "@/lib/api";

interface Captured {
  method: string;
  url: URL;
  body?: string;
}

/**
 * Stubs `fetch` and records what was requested. This is the one place that
 * exercises the real transport — components mock `@/api/users` instead, so an
 * endpoint change surfaces here rather than in every component test.
 */
function stubFetch(response: unknown, status = 200) {
  const captured: Captured[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.url;
      captured.push({
        method: (init?.method ?? (typeof input === "object" ? input.method : "GET")).toUpperCase(),
        url: new URL(url),
        body: typeof init?.body === "string" ? init.body : undefined,
      });

      return new Response(JSON.stringify(response), {
        status,
        headers: { "content-type": "application/json" },
      });
    }),
  );

  return captured;
}

const emptyPage = { users: [], total: 0 };

describe("users api", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("listUsers", () => {
    it("requests GET /users with the default page size", async () => {
      const captured = stubFetch(emptyPage);

      await listUsers();

      expect(captured).toHaveLength(1);
      expect(captured[0]?.method).toBe("GET");
      expect(captured[0]?.url.pathname).toBe("/users");
      expect(captured[0]?.url.searchParams.get("limit")).toBe(String(USERS_PAGE_SIZE));
      expect(captured[0]?.url.searchParams.get("offset")).toBe("0");
    });

    it("passes through explicit pagination", async () => {
      const captured = stubFetch(emptyPage);

      await listUsers({ limit: 5, offset: 10 });

      expect(captured[0]?.url.searchParams.get("limit")).toBe("5");
      expect(captured[0]?.url.searchParams.get("offset")).toBe("10");
    });

    it("returns the unwrapped body", async () => {
      stubFetch({ users: [{ id: "u1", givenName: "Ada", familyName: "Lovelace" }], total: 1 });

      const result = await listUsers();

      expect(result.total).toBe(1);
      expect(result.users[0]?.givenName).toBe("Ada");
    });
  });

  describe("getUser", () => {
    it("requests GET /users/:userId", async () => {
      const captured = stubFetch({ user: { id: "u1", givenName: "Ada", familyName: "Lovelace" } });

      await getUser("u1");

      expect(captured[0]?.method).toBe("GET");
      expect(captured[0]?.url.pathname).toBe("/users/u1");
    });

    it("rejects with a BackendRequestError carrying the backend error code", async () => {
      stubFetch({ errId: "e1", code: "NOT_FOUND_ERROR", message: "nope", statusCode: 404 }, 404);

      await expect(getUser("missing")).rejects.toBeInstanceOf(BackendRequestError);
      await expect(getUser("missing")).rejects.toMatchObject({ code: "NOT_FOUND_ERROR", status: 404 });
    });
  });

  describe("createEMailUser", () => {
    it("posts the body to /users/email", async () => {
      const captured = stubFetch({ user: {}, provider: {} });

      await createEMailUser({
        givenName: "Ada",
        familyName: "Lovelace",
        email: "ada@example.com",
        password: "correct-horse",
      });

      expect(captured[0]?.method).toBe("POST");
      expect(captured[0]?.url.pathname).toBe("/users/email");
      expect(JSON.parse(captured[0]?.body ?? "{}")).toMatchObject({ email: "ada@example.com" });
    });
  });

  describe("query keys", () => {
    it("builds the same key regardless of how defaults are supplied", () => {
      expect(usersListQuery().queryKey).toEqual(usersListQuery({ offset: 0 }).queryKey);
      expect(usersListQuery().queryKey).toEqual(usersListQuery({ limit: USERS_PAGE_SIZE, offset: 0 }).queryKey);
    });

    it("distinguishes pages", () => {
      expect(usersListQuery({ offset: 0 }).queryKey).not.toEqual(usersListQuery({ offset: 25 }).queryKey);
    });

    it("nests under a common prefix so all user queries can be invalidated at once", () => {
      expect(usersListQuery().queryKey.slice(0, 1)).toEqual(userKeys.all);
      expect(userKeys.detail("u1").slice(0, 1)).toEqual(userKeys.all);
    });
  });
});
