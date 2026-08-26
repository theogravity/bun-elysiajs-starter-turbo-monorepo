# @internal/backend-errors

The error type used across the API. Every failed request in the backend produces
an `ApiError`, and the backend's global error handler serializes it into one
uniform response body.

## Two ways to produce an error

Every failed request in the backend returns the same body. How you produce it
depends on whether the failure is part of the endpoint's contract.

### Expected failures — build the body and return it

For a failure the endpoint is designed to produce, the route returns it via
Elysia's `status()`. Use `apiErrorBody` from
`apps/backend/src/lib/api-error.ts`, which wraps `createApiError`:

```typescript
import { BackendErrorCodes } from "@internal/backend-errors";
import { apiErrorBody } from "@/lib/api-error.js";

if (!user) {
  return status(
    404,
    apiErrorBody({
      code: BackendErrorCodes.NOT_FOUND_ERROR,
      message: "No user exists with that ID",
      metadataSafe: { userId },
    }),
  );
}
```

Returning rather than throwing is what lets Elysia check the body against the
route's `response` schema and lets Eden Treaty clients narrow `error.value` by
status code. A thrown error gets neither.

### Unexpected failures — throw

For a violated invariant, or a failure deep in a call chain where threading a
result back would obscure the code:

```typescript
import { BackendErrorCodes, throwApiError } from "@internal/backend-errors";

throwApiError({
  code: BackendErrorCodes.INTERNAL_SERVER_ERROR,
  message: "Ledger and cache disagree after write",
  metadata: { ledgerId },
  isInternalError: true,
});
```

The global error handler catches it and serializes it identically.
`throwApiError` returns `never`, so TypeScript narrows after the call:

```typescript
if (!record) {
  throwApiError({ code: BackendErrorCodes.INTERNAL_SERVER_ERROR });
}

record.id; // non-nullable here, no cast needed
```

**Never `throw new Error()`.** It produces a generic 500 with no code for the
client to branch on.

Use `createApiError` directly when you need the error as a value — to attach it as
a `causedBy` or collect it in a batch result — rather than raising or returning it.

## Codes and statuses

The code determines the HTTP status and the default message.

| Code | Status | Default message |
|------|--------|-----------------|
| `BAD_REQUEST` | 400 | Bad request |
| `INPUT_VALIDATION_ERROR` | 400 | Invalid input |
| `INVALID_CREDENTIALS` | 401 | Invalid credentials |
| `ACCESS_DENIED` | 403 | Access denied |
| `NOT_FOUND_ERROR` | 404 | Resource not found |
| `EXISTS_ERROR` | 409 | Resource already exists |
| `INTERNAL_SERVER_ERROR` | 500 | Internal server error |

To add a code, add it to the `BackendErrorCodes` enum and to `BackendErrorCodeDefs`
in `src/error-codes.ts` — both, or the lookup throws at runtime.

## Options

| Option | Effect |
|--------|--------|
| `message` | Overrides the default message for the code |
| `metadataSafe` | Returned to the client under `metadata` |
| `metadata` | Logged only. Never serialized to the client |
| `causedBy` | Underlying error, serialized in non-production responses |
| `isInternalError` | Client gets a generic 500; the real cause is still logged under the same `errId` |
| `logLevel` | Log level for this error. Defaults to `"error"` |
| `doNotLog` | Suppress logging for an error already logged elsewhere |
| `validationError` | Field-level validation failures |

The `metadata` / `metadataSafe` split is the important one: anything that must not
reach the client goes in `metadata`.

`apiErrorBody` defaults `logLevel` to `"debug"` rather than `"error"`, since an
expected 4xx that a route deliberately returns is not a server fault. A returned
status never reaches the global `onError`, so `apiErrorBody` does the logging
itself — that is why it exists rather than routes calling `createApiError`
directly.

## Serialization

Each `ApiError` carries an `errId` (a nanoid) that appears in both the log line and
the response, so a user-reported error can be traced to its log entry.

- `toJSON()` — everything, including `stack` and `causedBy`. Used outside production.
- `toJSONSafe()` — omits the stack, `causedBy`, and unsafe `metadata`. Used in production.

The handler picks between them based on `IS_PROD`. The wire shape is described by
`ApiErrorResponseSchema` in `apps/backend/src/schema/error.type.ts`; declare it on
a route's `response` map to document the failure in OpenAPI.

## Note on Elysia integration

Elysia's documented pattern for custom errors — registering the class with
`.error({ API_ERROR: ApiError })` and switching on the narrowed `code` in
`onError` — **does not work with this class**. Elysia derives the error code from
the thrown error's own `code` property, and `ApiError.code` is already a
`BackendErrorCodes` value. Registration yields `code === "NOT_FOUND_ERROR"` rather
than `"API_ERROR"`, so such a switch silently falls through to the 500 branch.
`apps/backend/src/plugins/error-handler.plugin.ts` uses an `instanceof` check
instead, and that check must run before any check on `code`.
