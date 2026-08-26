# AGENTS.md

How this project is laid out and how to work in it.

## Read this first

Most of the detail lives next to the code. Start here, then open the file for the
area you are touching:

| If you are working on... | Read |
|--------------------------|------|
| API routes, services, repositories, migrations, tests | `apps/backend/AGENTS.md` |
| React routes, components, data fetching | `apps/frontend/AGENTS.md` |
| Error codes and the API error contract | `packages/backend-errors/README.md` |
| The typed API client | `packages/backend-client/README.md` |
| Writing a migration | `apps/backend/src/db/migrations/README.md` |

Repo-wide conventions (code style, dependency pinning, testing, verification) are
in `.claude/rules/`.

## Project overview

A **Bun-powered TypeScript monorepo** using Turborepo. It contains an ElysiaJS API
backend, a React frontend, and a type-safe Eden Treaty client SDK shared between
them.

```
bun-elysiajs-starter-turbo-monorepo/
├── apps/
│   ├── backend/                    # ElysiaJS API server
│   └── frontend/                   # React (Vite, TanStack Router/Query, Tailwind)
├── packages/
│   ├── tsconfig/                   # Shared TypeScript configuration
│   ├── backend-errors/             # ApiError type and error codes
│   └── backend-client/             # Eden Treaty client SDK
├── turbo.json                      # Turbo task configuration
├── biome.json                      # Linting and formatting
└── lefthook.yml                    # Git hooks
```

### Technology stack

- **Runtime / package manager**: Bun (>= 1.4.0). Never npm, pnpm, or yarn.
- **Backend**: ElysiaJS, Kysely + PostgreSQL, LogLayer, `@elysiajs/openapi` (Scalar UI at `/docs`)
- **Frontend**: React 19, Vite, TanStack Router, TanStack Query, Tailwind CSS v4
- **Validation**: Elysia's `t` module (TypeBox), which also generates the OpenAPI schema
- **Client SDK**: Eden Treaty — type inference, no code generation
- **Testing**: Vitest, Testcontainers (backend), React Testing Library (frontend)
- **Tooling**: Turborepo, Biome, syncpack, lefthook, commitlint

## Common commands

```bash
bun run start              # turbo watch dev — everything, in watch mode
turbo build                # Build all packages in dependency order
bun run test               # Tests across all packages
bun run lint               # Biome across all packages
bun run verify-types       # tsc --noEmit across all packages
```

Per-package scripts are documented in that package's `AGENTS.md`.

| Service | URL |
|---------|-----|
| API server | http://localhost:3080 |
| OpenAPI docs | http://localhost:3080/docs |
| Frontend | http://localhost:5173 |
| PGAdmin | http://localhost:5050 |

### Setup

```bash
bun install
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
docker compose up -d          # Postgres + PGAdmin
bun run db:migrate:latest
```

Docker is required for local Postgres and for the backend test suite.

### Cleaning

```bash
bun run clean              # node_modules, turbo cache, dist, .hashes.json
bun run clean:turbo        # .turbo directories only
bun run clean:dist         # dist directories only
```

## Example scaffolding vs. project infrastructure

This is a **starter template**. The `users` resource is illustrative scaffolding: it
exists to show the layering working end to end, not because the project is about
users. Anyone building on this repo should replace it with their actual domain.

**If you are an agent asked to build a feature: model what was actually asked for.**
Follow the *patterns* the `users` resource demonstrates — do not extend, preserve, or
imitate the users domain itself unless the request is genuinely about users. Treat
`users` files as deletable, and do not assume any table, route, or type below exists
in the finished product.

### Scaffolding — replace or delete

| Path | What it is |
|------|------------|
| `apps/backend/src/db/migrations/0001-init.ts` | The `users` / `user_providers` tables and their enum types |
| `apps/backend/src/db/types/users.db-types.ts`, `user-providers.db-types.ts` | Example table types |
| `apps/backend/src/db/repositories/users.repository.ts`, `user-providers.repository.ts` | Example repositories |
| `apps/backend/src/services/users.service.ts` | Example service |
| `apps/backend/src/api/users/**` | Example routes and their tests |
| `apps/backend/src/schema/user.type.ts`, `user-provider.type.ts`, `enums.type.ts` | Example shared schemas |
| `apps/frontend/src/routes/users.tsx` | Example page |
| `apps/frontend/src/routes/index.tsx` | Example page — replace its contents; deleting the file leaves `/` unrouted |
| `apps/frontend/src/routes/__tests__/-users.test.tsx` | Example route test |
| The `<Link>` entries in `apps/frontend/src/routes/__root.tsx` | Nav pointing at the example pages |

Deleting a scaffolding file means also removing its registration — the `Database`,
`Repositories`, and `Services` interfaces, the constructor calls in `ApiContext`, the
`apiModels` entries, and the `.use()` in `src/api/routes.ts`. The same list appears in
[Adding a feature end-to-end](apps/backend/AGENTS.md), in reverse.

On the frontend, remove the matching `<Link>` in `__root.tsx` in the same change:
TanStack types `to` against the generated route tree, so a link to a deleted route is a
type error, not a dead link at runtime.

### Infrastructure — keep and build on

Everything else, in particular: the layering and `ApiContext`; `contextPlugin` and
`errorHandlerPlugin`; `apiErrorBody` and the `ApiErrorResponse` schema; `BaseRepository`
and `BaseService`; `src/db/index.ts` (the `CamelCasePlugin` registration); the
Testcontainers setup in `src/test-utils/`; the frontend's `src/lib/api.ts` client and
`unwrap()`; and all three `packages/`.

**One coupled piece to watch:** `testFramework.generateTestFacets()` and
`generateNewUsers()` (`apps/backend/src/test-utils/test-framework/`) create *users* and
return headers that mock authentication. The Testcontainers plumbing around them is
infrastructure, but these two methods assume the example schema — adapt them rather
than deleting them when the `users` table goes.

## Backend architecture in one screen

Requests flow in one direction:

```
route (src/api/**) -> service (src/services/**) -> repository (src/db/repositories/**) -> Postgres
```

**Routes call services; services call repositories. Routes never call repositories
directly.** `ApiContext` exposes only `log` and `services`, so a route handler has
no path to a repository — needing one means a service method is missing.

Services return domain outcomes; routes map them onto HTTP with
`return status(404, apiErrorBody({ ... }))`. Failures are **returned, not thrown** —
only a returned status is checked against the route's response schema and narrowed
by status code for client code. Throwing is reserved for genuinely unexpected
failures, and `throw new Error()` is never correct. Every failed request produces
the same response body.

`apps/backend/AGENTS.md` has the full breakdown, including the conventions that are
not guessable from the surrounding code — `.js` import extensions, the
snake_case/camelCase split across the database boundary, and why validation
failures return 400 rather than 422.

## Build order and why it matters

Turbo resolves the order from workspace dependencies:

1. `@internal/backend-errors`
2. `@internal/backend` — depends on backend-errors
3. `@internal/backend-client` — depends on backend for the `App` type
4. `apps/frontend` — depends on backend-client

**Run `turbo build` after changing backend routes or schemas.** The client is not
generated from an OpenAPI spec; it is `treaty<App>` applied to the backend's
exported type. The frontend only sees a new route once `apps/backend/dist/*.d.ts`
has been re-emitted.

This chain is load-bearing. `apps/backend` builds with `tsconfig.build.json`, which
sets `declaration: true`; without declarations `@internal/backend` resolves to plain
JavaScript and `App` degrades to `any`, which would give an untyped client where
calls to non-existent routes still compile.

The shared tsconfig sets `noImplicitAny: true` to keep that from failing silently:
a missing declaration surfaces as
`TS7016: Could not find a declaration file for module '@internal/backend'`. If you
see that, or the type `"Please install Elysia before using Eden"`, run
`turbo build`.

For development, `build:dev` uses `hash-runner` for incremental rebuilds.

## Verification

Run all three after any change, and fix failures before moving on:

```bash
bun run verify-types
bun run lint
bun run test
```

Add `turbo build` when you have touched backend routes, schemas, or anything in
`packages/`.

## Dependencies

All versions are pinned exactly — no `^` or `~`. After `bun add`, run
`bun run syncpack:format` and `bun install`. The pre-commit hook rejects unpinned
versions.

```bash
bun run syncpack:update    # Update all dependencies
bun run syncpack:lint      # Check for version mismatches across packages
```

## Git hooks (lefthook)

**Pre-commit:** refreshes the lockfile, formats and lints `package.json` files via
syncpack, runs `turbo run lint:staged` on staged files.

**Pre-push:** `turbo run verify-types` and `turbo run lint`.

## CI

`.github/workflows/` runs build, syncpack lint, type checking, lint, and the full
test suite on every pull request **and on every push to `main`**. The push trigger
matters here: this repo is worked on by committing directly to `main`, and the
pre-push hook only covers `verify-types` and `lint` — without it, tests and the
build would never run anywhere.

Two conventions in those workflows are deliberate, so do not "tidy" them:

- **Actions are pinned to commit SHAs**, with the version in a trailing comment
  (`uses: actions/checkout@3d3c42e5… # v7.0.1`). A floating tag like `@v7` can be
  force-moved by whoever controls the upstream repo, which is a real supply-chain
  attack path. Never replace a SHA with a version tag. Dependabot
  (`.github/dependabot.yml`) raises a monthly PR that updates the SHA and its
  comment together.
- **Each workflow declares `permissions: contents: read`.** The jobs only clone and
  run checks. Declaring it in the workflow rather than relying on the repository
  setting means the restriction survives this template being copied into another
  org, where the default may be read/write.

Dependabot manages the actions only. JavaScript dependencies are pinned exactly and
updated together with `bun run syncpack:update`, which keeps versions consistent
across the workspace — per-package Dependabot PRs would fight with that.
