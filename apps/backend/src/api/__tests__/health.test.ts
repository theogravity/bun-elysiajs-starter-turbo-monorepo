import { describe, expect, it } from "bun:test";
import { testApi } from "@/test-utils/test-server.js";

describe("Health", () => {
  it("reports ok when the database is reachable", async () => {
    const { data, status } = await testApi.health.get();

    expect(status).toBe(200);
    expect(data?.status).toBe("ok");
  });

  it("keeps GET / as a cheap liveness check", async () => {
    const { status } = await testApi.get();

    expect(status).toBe(200);
  });
});
