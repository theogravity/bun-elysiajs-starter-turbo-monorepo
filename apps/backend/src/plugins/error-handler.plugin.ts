import { ApiError, BackendErrorCodes, createApiError } from "@internal/backend-errors";
import { Elysia } from "elysia";
import { IS_PROD } from "@/constants.js";
import { getLogger } from "@/utils/logger.js";

/**
 * Serializes an ApiError for the wire. Outside production the full error is
 * returned (including `stack` and `causedBy`); in production only the
 * client-safe fields are.
 */
function serialize(error: ApiError) {
  return IS_PROD ? error.toJSONSafe() : error.toJSON();
}

/**
 * Global error handler.
 *
 * This is the safety net for failures that are **thrown**: unexpected errors,
 * `ApiError`s raised by `throwApiError`, and Elysia's own schema validation. A
 * route's expected failures are returned with `status()` + `apiErrorBody()` and do
 * not pass through here — see `src/lib/api-error.ts`.
 *
 * Either way the response body is identical, and is described by
 * `ApiErrorResponseSchema` in `src/schema/error.type.ts`.
 *
 * ## Why this does not use `.error()`
 *
 * Elysia's documented pattern for custom errors is to register the class with
 * `.error({ API_ERROR: ApiError })` and switch on the narrowed `code` in `onError`.
 * That does not work for `ApiError`, because Elysia derives `code` from the thrown
 * error's own `code` property when it has one — and `ApiError.code` is already a
 * `BackendErrorCodes` value that we deliberately expose on the wire. Registering
 * the class yields `code === "NOT_FOUND_ERROR"`, never `"API_ERROR"`, so the switch
 * silently falls through to the 500 branch.
 *
 * An `instanceof` check is therefore the correct discriminator here. Keep it first:
 * it must run before any check against `code`.
 *
 * @see https://elysiajs.com/patterns/error-handling.html
 */
export const errorHandlerPlugin = new Elysia({ name: "error-handler" })
  .onError(({ code, error, set }) => {
    const log = getLogger();

    // An ApiError raised by throwApiError(). Expected failures are returned via
    // status() + apiErrorBody() and never reach this handler, so what arrives here
    // is an unexpected failure. Must be checked before `code`, see the note above.
    if (error instanceof ApiError) {
      if (!error.doNotLog) {
        log.withContext({ errId: error.errId }).errorOnly(error, {
          logLevel: error.logLevel as any,
        });
      }

      // isInternalError hides the real cause from the client but keeps it in the
      // log, reusing the same errId so the two can be correlated.
      if (error.isInternalError) {
        const wrapped = createApiError({
          code: BackendErrorCodes.INTERNAL_SERVER_ERROR,
          causedBy: error,
          ...(error.validationError ? { validationError: error.validationError } : {}),
        });

        wrapped.errId = error.errId;
        set.status = wrapped.statusCode;

        return serialize(wrapped);
      }

      set.status = error.statusCode;

      return serialize(error);
    }

    // Elysia's own schema validation failure, rewritten into the standard error
    // body so a client only ever parses one shape. This turns Elysia's native 422
    // into a 400 INPUT_VALIDATION_ERROR.
    if (code === "VALIDATION") {
      const validationError = createApiError({
        code: BackendErrorCodes.INPUT_VALIDATION_ERROR,
        validationError: {
          // Elysia does not expose a type for the validation payload on the
          // error it throws; `all` is the array of individual field failures.
          validation: (error as any)?.all ?? [],
          validationContext: "body",
          message: error.message ?? "Validation error",
        },
        causedBy: error,
      });

      set.status = validationError.statusCode;

      return serialize(validationError);
    }

    const internalError = createApiError({
      code: BackendErrorCodes.INTERNAL_SERVER_ERROR,
      message: "An internal server error occurred.",
      causedBy: error,
    });

    log.withContext({ errId: internalError.errId }).errorOnly(error as Error);

    set.status = internalError.statusCode;

    return serialize(internalError);
  })
  .as("global");
