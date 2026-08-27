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

This only works if the backend emitted its `.d.ts` files, which is why `turbo build`
matters after a route change. Symptoms that the build is missing or stale:

- `TS7016: Could not find a declaration file for module '@internal/backend'`
- The type `"Please install Elysia before using Eden"` in an error message
- A newly added route missing from the client

The fix is always `turbo build`. Why it fails this way, and why `noImplicitAny`
makes it loud rather than silent, is explained in `AGENTS.md` under "Build order and
why it matters".

## Why `verify-types` and `test` declare `dependsOn: ["^build"]`

Without it, a package type-checks against whatever its dependencies last emitted —
possibly nothing, possibly something stale — **and Turbo caches that pass**. A
backend route removed in one commit stayed green in the frontend for exactly this
reason: `verify-types` reported success in 200ms from cache while the code it
checked no longer compiled.

Do not remove those `dependsOn` entries to speed the pipeline up. A green check that
ran against stale inputs is worse than a slow one.
