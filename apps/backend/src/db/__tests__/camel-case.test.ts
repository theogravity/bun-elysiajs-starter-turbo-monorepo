import { describe, expect, it } from "bun:test";
import { db } from "@/db/index.js";
import { testFramework } from "@/test-utils/test-framework/index.js";
import { testApi } from "@/test-utils/test-server.js";

/**
 * Better Auth is configured to write snake_case columns, so its tables go through
 * the CamelCasePlugin like ours. This guards that: if the field mapping in
 * `src/lib/auth.ts` is dropped, Better Auth reverts to quoted camelCase columns and
 * these queries stop resolving.
 */
describe("Better Auth tables and the CamelCasePlugin", () => {
  it("selects a Better Auth user with camelCase identifiers", async () => {
    const { user } = await testFramework.generateTestFacets();

    const row = await db
      .selectFrom("users")
      .select(["id", "email", "emailVerified", "createdAt"])
      .where("id", "=", user.id)
      .executeTakeFirstOrThrow();

    expect(row.id).toBe(user.id);
    expect(row.emailVerified).toBe(false);
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it("joins application data to a Better Auth user", async () => {
    const { user, headers } = await testFramework.generateTestFacets();

    await testApi.notes.post({ title: "Joined", body: "b" }, { headers });

    const row = await db
      .selectFrom("notes")
      .innerJoin("users", "users.id", "notes.userId")
      .select(["notes.title", "users.email"])
      .where("notes.userId", "=", user.id)
      .executeTakeFirstOrThrow();

    expect(row.title).toBe("Joined");
    expect(row.email).toBe(user.email);
  });
});
