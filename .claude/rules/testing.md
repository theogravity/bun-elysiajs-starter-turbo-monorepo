# Testing

## Commands

```bash
turbo test                 # Run tests across all packages
```

Per package:

```bash
cd apps/backend
bun run test                                        # everything
bun run test src/api/users/__tests__/get-user.route.test.ts   # one file
bun run test -t "should return a 404"               # by test name
```

Backend tests need **Docker running** — Testcontainers starts a PostgreSQL container and
applies all migrations before the suite. A new migration needs no extra test wiring.

## Guidelines

**Always write tests for new features.** Every new service, repository, route, or significant function should have corresponding tests. Tests should cover:

- Happy path (expected behavior)
- Edge cases (empty inputs, null values, pagination boundaries)
- Error conditions (invalid inputs, not found cases)

Test files live in `__tests__/` directories alongside the code they test:
```
src/api/users/
├── get-user.route.ts
└── __tests__/
    └── get-user.route.test.ts

src/services/
├── users.service.ts
└── __tests__/
    └── users.service.test.ts
```

Frontend component and route tests mock `@/api/{resource}`; only `src/api/__tests__/`
stubs `fetch`. Frontend route tests are the exception: they go in `src/routes/__tests__/` and **must be
prefixed with `-`** (`-users.test.tsx`) so the TanStack Router plugin does not treat them as
routes. They are still collected and run by Vitest; the prefix only excludes them from
`routeTree.gen.ts`.

## Testing a Service Directly

A business rule reads better tested against the service than through a route, where
the assertion becomes about a status code. `getRequestlessContext()` gives you the
services outside a request:

```typescript
const { notes } = getRequestlessContext().services;

await expect(notes.getOwnedNote({ userId: otherId, noteId })).resolves.toBeUndefined();
```

`apps/backend/src/services/__tests__/notes.service.test.ts` is the worked example.

## Testing API Routes

Drive routes through `testApi`, an Eden Treaty client bound directly to the app instance, so
no network is involved:

```typescript
import { testApi } from "@/test-utils/test-server.js";
import { testFramework } from "@/test-utils/test-framework/index.js";

const { user, headers } = await testFramework.generateTestFacets();

const { data, status } = await testApi.users({ userId: user.id }).get();

expect(status).toBe(200);
expect(data?.user.id).toBe(user.id);
```

Path parameters are expressed by **calling** the segment, not by string interpolation.

## Asserting Errors

Assert on the error `code`, not the message — messages are free to change:

```typescript
const { error, status } = await testApi.users({ userId: unknownId }).get();

expect(status).toBe(404);
expect((error?.value as { code?: string })?.code).toBe(BackendErrorCodes.NOT_FOUND_ERROR);
```

Note that schema validation failures come back as **400 `INPUT_VALIDATION_ERROR`**, not
Elysia's native 422 — the global error handler rewrites them so clients only parse one shape.

## Regressions

When fixing a bug, add a test that reproduces the bug before fixing it.

## After Making Code Changes

After any code change, check if tests need updating due to changed behavior (e.g., different error types, response formats, new error conditions). Then run full verification - see `verification.md`.
