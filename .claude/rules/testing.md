# Testing

## Which test to write

Six kinds, each with a job. Pick the cheapest one that can actually fail for the
reason you care about.

| Kind | Lives in | Write one when |
|------|----------|----------------|
| Service | `apps/backend/src/services/__tests__/` | A business rule — ownership, a derived value, a transaction. No HTTP involved. |
| Route | `apps/backend/src/api/{resource}/__tests__/` | The HTTP contract: status codes, auth, validation, response shape. |
| Database | `apps/backend/src/db/__tests__/` | Query behaviour or a schema contract, such as the camelCase mapping. |
| API layer | `apps/frontend/src/api/__tests__/` | A request's method, path, and parameters. **The only place that stubs `fetch`.** |
| Component / route | `apps/frontend/src/routes/__tests__/` or beside the component | Rendering, form validation, redirects. Mocks `@/api/{resource}`. |
| End-to-end | `e2e/tests/` | A seam between the apps: cookies crossing origins, a guard redirecting, an email arriving. |

A business rule tested through a route makes the assertion about a status code
instead of the rule. Prefer the service test, and let the route test cover that the
rule is wired to the right status.

## Commands

Unit and integration tests run on **`bun test`** — there is no Vitest or Jest here.
Import `describe`, `it`, `expect`, `mock`, and the lifecycle hooks from `bun:test`.
Browser tests are Playwright, in `e2e/`.

```bash
bun run test                  # everything except e2e, across all packages
bun run test:e2e              # browser tests (needs Docker + `bun run test:e2e:install` once)
```

Within a package:

```bash
cd apps/backend
bun run test                                                   # everything
bun run test src/api/notes/__tests__/notes.route.test.ts       # one file
bun run test -t "hides another user's note"                    # by name
```

Backend tests need **Docker running** — Testcontainers starts PostgreSQL and applies
every migration before the suite, so a new migration needs no test wiring.

## Where the detail lives

This file covers what applies everywhere. For depth, read the doc for the layer you
are touching rather than a copy here:

- `apps/backend/AGENTS.md` — `testApi`, `testFramework`, authenticated requests, logging in tests
- `apps/frontend/AGENTS.md` — `renderRoute`, `stubFetch`, mocking the API module, form assertions
- `e2e/AGENTS.md` — how the stack starts, asserting on email, why Playwright's `webServer` is unused

## Rules that apply everywhere

**Always write tests for new features.** Every new service, repository, route, or
significant function gets one, covering the happy path, edge cases (empty results,
pagination boundaries), and error conditions.

**Test files live in `__tests__/` next to the code.** Frontend *route* tests are the
exception: they go in `src/routes/__tests__/` and **must be prefixed with `-`**
(`-notes.test.tsx`) so the TanStack Router plugin does not treat them as routes.
They still run; the prefix only keeps them out of `routeTree.gen.ts`.

**Assert on error codes, not messages.** Messages are free to change:

```typescript
const { error, status } = await testApi.notes({ noteId }).get({ headers });

expect(status).toBe(404);
expect((error?.value as { code?: string })?.code).toBe(BackendErrorCodes.NOT_FOUND_ERROR);
```

Schema validation failures arrive as **400 `INPUT_VALIDATION_ERROR`**, not Elysia's
native 422 — the global handler rewrites them so clients parse one shape.

**Reproduce before fixing.** A bug fix starts with a test that fails for the
reported reason. Several bugs in this repo were only understood once that test
existed.

**Do not mock what you are testing.** Stub `fetch` only in `src/api/__tests__/`;
everything above it mocks the API module. A component test that stubs `fetch` is
asserting on the transport by accident.

## After making code changes

Check whether behaviour changes require test updates — different error types,
response shapes, new failure modes — then run full verification. See
`verification.md`.
