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

`apps/backend/AGENTS.md` opens with "Conventions you will get wrong if you don't
read this". That is literal — it covers four things that are invisible in the
surrounding code and fail at runtime rather than at compile time. Read them before
your first edit.

Repo-wide conventions (code style, dependency pinning, testing, verification,
security posture) are in `.claude/rules/`.

### How these files reach a coding agent

`AGENTS.md` is the source of truth and the format most coding agents read directly.
Claude Code reads `CLAUDE.md` instead, so each `AGENTS.md` has a one-line
`CLAUDE.md` beside it that imports it:

```
CLAUDE.md                 -> @AGENTS.md   (loads at session start)
apps/backend/CLAUDE.md    -> @AGENTS.md   (loads when a backend file is read)
apps/frontend/CLAUDE.md   -> @AGENTS.md   (loads when a frontend file is read)
```

Nested imports load on demand, so an agent planning work in an app before opening
any of its files should read that app's `AGENTS.md` explicitly.

**Put documentation in `AGENTS.md`, never in `CLAUDE.md`.** The `CLAUDE.md` files
are bridges and must stay one line, or the two formats will drift. An import is
used rather than a `CLAUDE.md -> AGENTS.md` symlink because symlink creation on
Windows needs Administrator rights or Developer Mode, which would break this
template for anyone cloning it there.

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
- **Backend**: ElysiaJS, Kysely + PostgreSQL, Better Auth, LogLayer, `@elysiajs/openapi` (Scalar UI at `/docs`)
- **Frontend**: React 19, Vite, TanStack Router, TanStack Query, Tailwind CSS v4
- **Validation**: Elysia's `t` module (TypeBox), which also generates the OpenAPI schema
- **Auth**: Better Auth — email/password, cookie sessions, admin plugin (roles, ban, impersonate)
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

Set a real `BETTER_AUTH_SECRET` in `apps/backend/.env` before doing anything beyond
local development — `openssl rand -base64 32`. To make yourself an admin, sign up
through the UI and then run
`update users set role = 'admin' where email = 'you@example.com';`, since the admin
endpoints require an existing admin.

Docker is required for local Postgres and for the backend test suite.

### Cleaning

```bash
bun run clean              # node_modules, turbo cache, dist, .hashes.json
bun run clean:turbo        # .turbo directories only
bun run clean:dist         # dist directories only
```

## Example scaffolding vs. project infrastructure

This is a **starter template**. The `notes` resource is illustrative scaffolding: it
exists to show the layering working end to end and how application data hangs off an
authenticated user, not because the project is about notes. Replace it with the real
domain.

**If you are an agent asked to build a feature: model what was actually asked for.**
Follow the *patterns* `notes` demonstrates — do not extend, preserve, or imitate the
notes domain itself unless the request is genuinely about notes. Treat those files as
deletable, and do not assume any table, route, or type below exists in the finished
product.

Authentication is the exception: Better Auth is infrastructure, not an example.

### Scaffolding — replace or delete

| Path | What it is |
|------|------------|
| `apps/backend/src/db/migrations/0002-notes.ts` | The `notes` table |
| `apps/backend/src/db/types/notes.db-types.ts` | Example table types |
| `apps/backend/src/db/repositories/notes.repository.ts` | Example repository |
| `apps/backend/src/services/notes.service.ts` | Example service, including the ownership rule |
| `apps/backend/src/api/notes/**` | Example routes and their tests |
| `apps/backend/src/schema/note.type.ts` | Example shared schema |
| `apps/frontend/src/api/notes.ts` and its test | Example API definitions |
| `apps/frontend/src/routes/notes.tsx` | Example page |
| `apps/frontend/src/routes/index.tsx` | Replace its contents; deleting the file leaves `/` unrouted |
| `apps/frontend/src/routes/__tests__/-notes.test.tsx` | Example route test |
| The `notes` `<Link>` in `apps/frontend/src/routes/__root.tsx` | Nav pointing at the example page |

**Authentication is not scaffolding.** Better Auth, its migration
(`0001-better-auth.ts`), `src/lib/auth.ts`, `src/plugins/auth.plugin.ts`, the auth
screens, and `src/lib/auth-client.ts` are the template. Keep them.

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
Testcontainers setup in `apps/backend/src/test-utils/`; the frontend's
`src/lib/api.ts` client, its `src/test-utils/` helpers, and `unwrap()`; and all three `packages/`.

`testFramework.generateTestFacets()` signs a real user up through Better Auth and
returns the session cookie, so it stays useful whatever domain replaces `notes`.

## Backend architecture in one screen

Requests flow in one direction:

```
route (src/api/**) -> service (src/services/**) -> repository (src/db/repositories/**) -> Postgres
```

**Routes call services; services call repositories. Routes never call repositories
directly.** `ApiContext` exposes only `log` and `services`, so a route handler has
no path to a repository — needing one means a service method is missing.

Authentication is Better Auth, mounted at `/api/auth/*` and deliberately outside this
chain — see "Authentication" in `apps/backend/AGENTS.md`.

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

## Adding a package to the monorepo

Workspaces are `apps/*` and `packages/*`. A new package needs five things, and
Turbo will silently skip tasks it cannot see, so none of them are optional.

**1. `packages/{name}/package.json`** — name it `@internal/{name}`, mark it
`private`, and point the entry fields at `dist/`. Copy the shape from
`packages/backend-errors/package.json`:

```json
{
  "name": "@internal/thing",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "scripts": {
    "build": "tsdown",
    "build:dev": "hash-runner",
    "clean": "rm -rf .turbo node_modules dist .hashes.json",
    "lint": "biome check --no-errors-on-unmatched --write --unsafe src",
    "lint:staged": "biome check --no-errors-on-unmatched --write --unsafe --staged src",
    "verify-types": "tsc --project tsconfig.json --noEmit"
  }
}
```

Every dependency version must be exact — no `^` or `~`. The pre-commit hook
rejects unpinned versions.

**2. `packages/{name}/tsconfig.json`** — extend the shared config:

```json
{
  "extends": "@internal/tsconfig/tsconfig.json",
  "include": ["./src/**/*"]
}
```

**3. `packages/{name}/turbo.json`** — inherit the root pipeline and declare task
inputs and outputs, or Turbo will cache incorrectly:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "extends": ["//"],
  "tasks": {
    "clean": {},
    "build": { "dependsOn": ["lint"], "inputs": ["*.json", "*.ts", "src/**"], "outputs": ["dist/**"] },
    "build:dev": { "inputs": ["*.json", "*.ts", "src/**"], "outputs": ["dist/**"] },
    "lint": { "inputs": ["*.ts", "*.json", "src/**"] },
    "verify-types": { "inputs": ["*.ts", "*.json", "src/**"] }
  }
}
```

**4. `packages/{name}/tsdown.config.ts`** — copy
`packages/backend-errors/tsdown.config.ts`. Keep `dts: true`; a package that does
not emit declarations degrades its consumers to `any` (see
[Build order](#build-order-and-why-it-matters)).

**5. Wire it up** — add `"@internal/thing": "workspace:*"` to the consuming
package, then `bun install` to link it. Turbo derives build order from that
dependency, so nothing else needs configuring.

Finish with `bun run syncpack:format && bun install`, then `turbo build` to
confirm the new package builds in the right order.

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
