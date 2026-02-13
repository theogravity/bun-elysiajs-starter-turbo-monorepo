import { ApiError, BackendErrorCodes, createApiError } from "@internal/backend-errors";
import { IS_PROD } from "@/constants.js";
import { getLogger } from "@/utils/logger.js";

export function errorHandler(ctx: any) {
  const { error, set, code } = ctx;
  const log = getLogger();

  if (error instanceof ApiError) {
    if (!error.doNotLog) {
      log
        .withContext({
          errId: error.errId,
        })
        .errorOnly(error, {
          logLevel: error.logLevel as any,
        });
    }

    if (error.isInternalError) {
      const e = createApiError({
        code: BackendErrorCodes.INTERNAL_SERVER_ERROR,
        causedBy: error,
        ...(error?.validationError
          ? {
              validationError: error.validationError,
            }
          : {}),
      });

      e.errId = error.errId;

      set.status = e.statusCode;
      return IS_PROD ? e.toJSONSafe() : e.toJSON();
    }

    set.status = error.statusCode;
    return IS_PROD ? error.toJSONSafe() : error.toJSON();
  }

  if (code === "VALIDATION") {
    const e = createApiError({
      code: BackendErrorCodes.INPUT_VALIDATION_ERROR,
      validationError: {
        validation: error?.all ?? [],
        validationContext: "body",
        message: error?.message ?? "Validation error",
      },
      causedBy: error,
    });

    set.status = e.statusCode;
    return IS_PROD ? e.toJSONSafe() : e.toJSON();
  }

  const e = createApiError({
    code: BackendErrorCodes.INTERNAL_SERVER_ERROR,
    message: "An internal server error occurred.",
    causedBy: error,
  });

  log
    .withContext({
      errId: e.errId,
    })
    .errorOnly(error);

  set.status = 500;
  return IS_PROD ? e.toJSONSafe() : e.toJSON();
}
