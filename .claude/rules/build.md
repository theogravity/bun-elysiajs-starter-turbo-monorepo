# Build

## When to Run `turbo build`

Run `turbo build` after making changes to:

- **Backend API routes or schemas** — re-emits the backend's type declarations, which
  is how `@internal/backend-client` and the frontend see the new routes
- **Any package in `packages/`** — ensures dependent apps receive the updates

```bash
turbo build
```

The Turbo pipeline handles the correct build order automatically:
`backend-errors` → `backend` → `backend-client` → `frontend`.

## How the client stays in sync

`@internal/backend-client` is **not** generated from an OpenAPI spec. It is Eden
Treaty — `treaty<App>` applied to the `App` type the backend exports — so the client's
shape is derived from the route definitions at type-check time. There is no codegen
step and nothing to commit.

The catch is that this only works if the backend has emitted `.d.ts` files.
`apps/backend` builds with `tsconfig.build.json` (`declaration: true`) for exactly
this reason. If that output is missing, `@internal/backend` resolves to plain
JavaScript and `App` would become `any` — a client that still compiles while having
lost all type safety.

`noImplicitAny: true` in the shared tsconfig is what stops that being silent: the
missing declaration is reported as
`TS7016: Could not find a declaration file for module '@internal/backend'`.

Symptoms that the build is missing or stale:

- `TS7016` on `@internal/backend`
- The type `"Please install Elysia before using Eden"` appears in an error message
- A newly added route is missing from the client

The fix is always `turbo build`.
