# @internal/backend-errors

The error type used across the API. Every failed request in the backend produces
an `ApiError`, and the backend's global error handler serializes it into one
uniform response body.

## What this package exports

| Export | Use |
|--------|-----|
| `BackendErrorCodes` | The error code enum. The code determines the HTTP status and the default message. |
| `createApiError(opts)` | Builds an `ApiError` and returns it, without raising. |
| `throwApiError(opts)` | Builds one and throws it. Returns `never`, so TypeScript narrows after the call — a `if (!x) throwApiError(...)` guard leaves `x` non-nullable with no cast. |
| `ApiError` | The error class. Carries `errId`, `code`, `statusCode`, metadata, and the serializers below. |
| `getErrorStatusCode`, `getErrorMessage` | Look up the status or default message for a code. |

**Never `throw new Error()` in backend code.** It produces a generic 500 with no
code for the client to branch on.

**Choosing between returning and throwing is a policy decision, not a package
one**, and it is documented once in
[`apps/backend/AGENTS.md`](../../apps/backend/AGENTS.md) under "Error handling".
In short: expected failures are returned by the route with Elysia's `status()`,
using the `apiErrorBody` helper in `apps/backend/src/lib/api-error.ts` (which wraps
`createApiError`); `throwApiError` is for unexpected failures. Read that section
before adding an error path.

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

`ApiError` has its own `code` property, which Elysia treats as the error code. That
makes Elysia's documented `.error({ API_ERROR: ApiError })` registration pattern
unusable here, and the global handler discriminates with `instanceof` instead. The
full explanation is in [`apps/backend/AGENTS.md`](../../apps/backend/AGENTS.md)
under "The error handler" — read it before changing that file.
