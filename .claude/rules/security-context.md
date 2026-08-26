# Security Context

This is a **starter template**, not a finished service. The security posture below
describes what the template currently ships, not a set of decisions to preserve.
Anything built on it is expected to add what it needs.

Do not read the gaps here as deliberate. If a task involves an endpoint that
handles real data, treat authentication and authorization as part of the work, or
say explicitly that you are leaving them out.

## What the template ships today

| Concern | State |
|---------|-------|
| Authentication | **None.** No route checks identity. There is no session, token, or API key handling anywhere in `src/api/`. |
| Authorization | **None.** No ownership or role checks. |
| CORS | Fully permissive — `cors()` in `src/server.ts` is called with no configuration, so any origin is allowed. |
| Rate limiting | None. |
| Transport | Plain HTTP locally. No HTTPS enforcement or HSTS. |
| Input validation | Present. Every route validates through an Elysia `t` schema, and unvalidated input cannot reach a handler. |
| SQL injection | Not a concern. Kysely parameterizes every query, and no raw SQL is interpolated from user input. |
| Password storage | bcrypt, cost factor 12, in the example user service. |
| Error responses | Safe in production. `IS_PROD` switches serialization to `toJSONSafe()`, which omits the stack, `causedBy`, and unsafe `metadata`. Non-production responses deliberately include them. |

## The test authentication mock

`src/test-utils/plugins/test-headers.plugin.ts` derives `userId` from a
`test-user-id` request header. That is a fixture for tests, not an auth system.

It is **not** reachable in production: `createApp()` in `src/server.ts` does not
use it. Only `testApp` in `src/test-utils/test-server.ts` composes it in. Keep it
that way — never add `testPlugins` to `createApp()`, and never build real
authorization on top of a client-supplied `userId` header.

## Adding authentication

Do it as an Elysia plugin in `src/plugins/`, following `contextPlugin`: a named
instance using `.resolve()` (or `.macro()` for per-route opt-in) so the resolved
identity is typed on the handler context. Reject with the existing error contract
— `ACCESS_DENIED` (403) or `INVALID_CREDENTIALS` (401) — so failures keep the same
response shape as everything else. See the error handling section of
`apps/backend/AGENTS.md`.

## Before deploying anywhere shared

Authentication and authorization; CORS restricted to known origins; rate limiting;
HTTPS enforcement; a secrets story that is not `.env` on disk; and a review of
whether any endpoint returns more than the caller should see.
