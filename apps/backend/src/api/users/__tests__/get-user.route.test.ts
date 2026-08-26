import { BackendErrorCodes } from "@internal/backend-errors";
import { describe, expect, it } from "vitest";
import { testFramework } from "@/test-utils/test-framework/index.js";
import { testApi } from "@/test-utils/test-server.js";

describe("Get user API", () => {
  it("should return the user", async () => {
    const { user } = await testFramework.generateTestFacets();

    const { data, status } = await testApi.users({ userId: user.id }).get();

    expect(status).toBe(200);
    expect(data?.user.id).toBe(user.id);
    expect(data?.user.givenName).toBe(user.givenName);
  });

  it("should return a 404 with a NOT_FOUND_ERROR code for an unknown user", async () => {
    const { error, status } = await testApi.users({ userId: "8ff9f0a1-6a5f-4a3f-9c1b-4b0a2f7c5d31" }).get();

    expect(status).toBe(404);

    // The route returns this via status() rather than throwing, so the body is
    // built by apiErrorBody rather than the global error handler. It must still
    // carry the standard fields, errId included.
    const body = error?.value as { code?: string; errId?: string; statusCode?: number };

    expect(body?.code).toBe(BackendErrorCodes.NOT_FOUND_ERROR);
    expect(body?.statusCode).toBe(404);
    expect(body?.errId).toEqual(expect.any(String));
  });

  it("should return a 400 INPUT_VALIDATION_ERROR when the id is not a uuid", async () => {
    // The global errorHandler rewrites Elysia's native 422 VALIDATION response
    // into a 400 with the standard ApiError body.
    const { error, status } = await testApi.users({ userId: "not-a-uuid" }).get();

    expect(status).toBe(400);
    expect((error?.value as { code?: string })?.code).toBe(BackendErrorCodes.INPUT_VALIDATION_ERROR);
  });
});
