import { describe, expect, it, mock } from "bun:test";
import { BackendRequestError } from "@/lib/api";
import { applyServerErrors } from "@/lib/form";

/** Mirrors what the backend returns for a schema validation failure. */
function validationError(entries: Array<{ path: string; message: string }>) {
  return new BackendRequestError(400, {
    errId: "e1",
    code: "INPUT_VALIDATION_ERROR",
    message: "Invalid input",
    statusCode: 400,
    validationError: { validation: entries },
  });
}

describe("applyServerErrors", () => {
  it("maps a JSON pointer onto the matching form field", () => {
    const setError = mock();

    applyServerErrors(setError, validationError([{ path: "/title", message: "Too short" }]));

    expect(setError).toHaveBeenCalledWith("title", { message: "Too short" });
  });

  it("maps every reported field, not just the first", () => {
    const setError = mock();

    applyServerErrors(
      setError,
      validationError([
        { path: "/title", message: "Too short" },
        { path: "/body", message: "Required" },
      ]),
    );

    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledWith("body", { message: "Required" });
  });

  it("converts a nested pointer to react-hook-form's dotted path", () => {
    const setError = mock();

    applyServerErrors(setError, validationError([{ path: "/address/city", message: "Required" }]));

    expect(setError).toHaveBeenCalledWith("address.city", { message: "Required" });
  });

  it("falls back to a form-level error when no field can be identified", () => {
    const setError = mock();

    applyServerErrors(setError, new BackendRequestError(401, { code: "INVALID_CREDENTIALS", message: "Sign in" }));

    expect(setError).toHaveBeenCalledWith("root", { message: "Sign in" });
  });

  it("handles a plain Error, such as a network failure", () => {
    const setError = mock();

    applyServerErrors(setError, new Error("Network down"));

    expect(setError).toHaveBeenCalledWith("root", { message: "Network down" });
  });
});
