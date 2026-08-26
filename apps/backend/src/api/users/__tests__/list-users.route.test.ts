import { describe, expect, it } from "vitest";
import { testFramework } from "@/test-utils/test-framework/index.js";
import { testApi } from "@/test-utils/test-server.js";

describe("List users API", () => {
  it("should return a page of users and the total count", async () => {
    const created = await testFramework.generateNewUsers(3);

    const { data, status } = await testApi.users.get({
      query: { limit: 100, offset: 0 },
    });

    expect(status).toBe(200);
    expect(data?.total).toBeGreaterThanOrEqual(created.length);

    const ids = data?.users.map((user) => user.id) ?? [];

    for (const user of created) {
      expect(ids).toContain(user.id);
    }
  });

  it("should respect the limit", async () => {
    await testFramework.generateNewUsers(2);

    const { data, status } = await testApi.users.get({
      query: { limit: 1, offset: 0 },
    });

    expect(status).toBe(200);
    expect(data?.users).toHaveLength(1);
  });

  it("should page through results with offset", async () => {
    await testFramework.generateNewUsers(2);

    const first = await testApi.users.get({ query: { limit: 1, offset: 0 } });
    const second = await testApi.users.get({ query: { limit: 1, offset: 1 } });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.data?.users[0]?.id).not.toBe(second.data?.users[0]?.id);
  });

  it("should reject a limit above the maximum", async () => {
    const { status } = await testApi.users.get({
      query: { limit: 1000, offset: 0 },
    });

    expect(status).toBe(400);
  });
});
