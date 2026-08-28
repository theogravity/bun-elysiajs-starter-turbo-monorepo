import { describe, expect, it } from "bun:test";
import { testFramework } from "@/test-utils/test-framework/index.js";
import { testApp } from "@/test-utils/test-server.js";

/** Exercises the mounted Better Auth handler itself, not our routes. */
describe("Better Auth", () => {
  it("signs a user up and issues a session cookie", async () => {
    const { user, headers } = await testFramework.generateTestFacets();

    expect(user.id).toBeTruthy();
    expect(headers.cookie).toContain("better-auth");
  });

  it("signs an existing user back in", async () => {
    const { user, password } = await testFramework.generateTestFacets();

    const headers = await testFramework.signIn({ email: user.email, password });

    expect(headers.cookie).toBeTruthy();
  });

  it("returns the session for a valid cookie", async () => {
    const { user, headers } = await testFramework.generateTestFacets();

    const response = await testApp.handle(
      new Request("http://localhost/api/auth/get-session", { headers: { cookie: headers.cookie } }),
    );
    const session = (await response.json()) as { user?: { id: string } } | null;

    expect(response.status).toBe(200);
    expect(session?.user?.id).toBe(user.id);
  });

  it("rejects a wrong password", async () => {
    const { user } = await testFramework.generateTestFacets();

    await expect(testFramework.signIn({ email: user.email, password: "wrong-password-entirely" })).rejects.toThrow();
  });

  it("lists users for an admin and refuses a normal user", async () => {
    const admin = await testFramework.generateTestFacets({ asAdmin: true });
    const normal = await testFramework.generateTestFacets();

    const asAdmin = await testApp.handle(
      new Request("http://localhost/api/auth/admin/list-users?limit=10", {
        headers: { cookie: admin.headers.cookie },
      }),
    );
    const asNormal = await testApp.handle(
      new Request("http://localhost/api/auth/admin/list-users?limit=10", {
        headers: { cookie: normal.headers.cookie },
      }),
    );

    expect(asAdmin.status).toBe(200);
    expect(asNormal.status).not.toBe(200);
  });
});
