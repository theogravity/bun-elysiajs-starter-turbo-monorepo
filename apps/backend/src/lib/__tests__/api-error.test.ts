import { describe, expect, it } from "bun:test";
import { BackendErrorCodes } from "@internal/backend-errors";
import { apiErrorBody } from "@/lib/api-error.js";
import { getLogger } from "@/utils/logger.js";

describe("apiErrorBody", () => {
  it("returns the standard error body", () => {
    const body = apiErrorBody({ code: BackendErrorCodes.NOT_FOUND_ERROR, message: "nope" });

    expect(body.code).toBe(BackendErrorCodes.NOT_FOUND_ERROR);
    expect(body.statusCode).toBe(404);
    expect(body.errId).toEqual(expect.any(String));
  });

  it("does not leak errId onto the shared logger", () => {
    // `withContext` mutates the LogLayer instance, so using it for errId left the
    // id attached to every later log line — including successful requests and the
    // shutdown message. errId belongs in per-call metadata instead.
    apiErrorBody({ code: BackendErrorCodes.NOT_FOUND_ERROR });

    expect(getLogger().getContext()).not.toHaveProperty("errId");
  });
});
