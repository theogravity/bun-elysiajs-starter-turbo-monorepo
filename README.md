# Bun ElysiaJS Turbo Monorepo Starter

A starter project for building a full-stack application using **Bun**, TypeScript, ElysiaJS, Kysely with Postgres, and React.

> **This project uses [Bun](https://bun.sh/) as its runtime and package manager.** Bun provides faster installs, native TypeScript execution, and improved performance over Node.js.

## Requirements

- [Bun](https://bun.sh/) >= 1.4.0
- [Docker](https://docs.docker.com/engine/install/) (for local Postgres and testing)

## Features

- **Bun-powered** - Uses Bun for package management, script execution, and runtime.
- ElysiaJS API server with TypeScript.
- React frontend with TanStack Router and TanStack Query.
- Monorepo setup using [`turbo`](https://turbo.build/) and [Bun workspaces](https://bun.sh/docs/install/workspaces).
- OpenAPI docs via Scalar UI at `/docs`.
- Type-safe client SDK via Eden Treaty.
- Sample REST tests using Vitest.
- Sample database migrations and repositories using Kysely.
- Authentication via [Better Auth](https://www.better-auth.com/): email/password, cookie sessions, and an admin plugin for roles, banning and impersonation.
- Sign-in, sign-up, account and admin user-management screens on the frontend.
- Shared error handler package for consistent API error responses.
- Layered backend architecture (routes -> services -> repositories) documented in `apps/backend/AGENTS.md`.
- Worked end-to-end example: a `notes` resource spanning migration, repository, service, protected routes, tests, and a React page — example scaffolding, meant to be replaced (see [Using this as a starter](#using-this-as-a-starter)).

## Packages

| Package | Description |
|---|---|
| `apps/backend` | ElysiaJS API server |
| `apps/frontend` | React frontend (Vite, TanStack Router, TanStack Query, Tailwind CSS) |
| `packages/backend-client` | Type-safe Eden Treaty client, inferred from the backend's `App` type |
| `packages/backend-errors` | `ApiError` type and shared error codes |
| `packages/tsconfig` | Shared TypeScript configuration |

## Libraries and tools used

- [`typescript`](https://www.typescriptlang.org/)
- [`bun`](https://bun.sh/) for package management and runtime
- [`turbo`](https://turbo.build/) for monorepo management
- [`elysia`](https://elysiajs.com/) for the API server framework
- [`@elysiajs/openapi`](https://elysiajs.com/plugins/openapi) for OpenAPI docs (Scalar UI)
- [`@elysiajs/eden`](https://elysiajs.com/eden/overview) for type-safe API client (Eden Treaty)
- [`react`](https://react.dev/) + [`vite`](https://vite.dev/) for the frontend
- [`@tanstack/react-router`](https://tanstack.com/router) for client-side routing
- [`@tanstack/react-query`](https://tanstack.com/query) for data fetching
- [`tailwindcss`](https://tailwindcss.com/) for styling
- [`kysely`](https://kysely.dev/) for the database query builder
- [`postgres`](https://www.postgresql.org/) for the database
- [`testcontainers`](https://www.testcontainers.org/) for testing with a sandboxed Postgres instance
- [`vitest`](https://vitest.dev/) for testing
- [`loglayer`](https://loglayer.dev/) + [`@loglayer/elysia`](https://loglayer.dev/integrations/elysia) for request-scoped logging
- [`hash-runner`](https://github.com/theogravity/hash-runner) for incremental dev builds
- [`biome`](https://biomejs.dev/) for linting and formatting
- [`syncpack`](https://jamiemason.github.io/syncpack/) for keeping package versions in sync
- [`commitlint`](https://commitlint.js.org/) for commit message linting

## Setup

1. Install Bun (if not already installed):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Copy the example env files:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   cp apps/frontend/.env.example apps/frontend/.env
   ```

4. Start the local Postgres server:
   ```bash
   docker compose up -d
   ```

   Already running something on 5432? Set `POSTGRES_PORT` (and `DB_PORT` in
   `apps/backend/.env`) to a free port — the compose file reads it.

5. Run database migrations:
   ```bash
   bun run db:migrate:latest
   ```

6. Set a real auth secret in `apps/backend/.env` (the example value is for local use only):
   ```bash
   openssl rand -base64 32
   ```

7. Create the first admin (the admin endpoints require an existing admin, so the
   first one is bootstrapped by a seed):
   ```bash
   bun run db:seed:run
   ```
   Defaults to `admin@example.com` / `changeme12345`; override with
   `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

## Development

```bash
turbo watch dev
```

| Service | URL |
|---|---|
| API server | http://localhost:3080 |
| Readiness probe | http://localhost:3080/health |
| OpenAPI docs | http://localhost:3080/docs |
| Frontend | http://localhost:5173 |
| PGAdmin | http://localhost:5050 |

## Testing

Requires Docker — uses Testcontainers to spin up a temporary Postgres instance per test run.

```bash
turbo test
```

## Build

```bash
turbo build
```

## Using the API Client

The `@internal/backend-client` package provides a type-safe Eden Treaty client:

```typescript
import { createBackendClient } from '@internal/backend-client'

const api = createBackendClient('http://localhost:3080')

// GET /notes?limit=25&offset=0 — requires a session cookie
const list = await api.notes.get({ query: { limit: 25, offset: 0 }, fetch: { credentials: 'include' } })

// POST /notes
const { data, error, status } = await api.notes.post({ title: 'Groceries', body: 'Milk' })

// GET /notes/:noteId — path params are expressed by calling the segment
const one = await api.notes({ noteId: 'a-uuid' }).get()
```

The client is Eden Treaty applied to the backend's exported `App` type, so there is no
code generation. It does depend on the backend's emitted type declarations: **run
`turbo build` after changing backend routes**, or the frontend will not see them. See
`packages/backend-client/README.md`.

## Database migrations

```bash
bun run db:migrate:create   # Create a new migration
bun run db:migrate:latest   # Apply all pending migrations
bun run db:migrate:undo     # Roll back the last migration
```

## Update all dependencies

```bash
bun run syncpack:update
```

## Using this as a starter

The `notes` resource is **example scaffolding**, not a feature. It exists to show the
layering working end to end — migration → repository → service → route → test, plus a
React page consuming the typed client. Replace it with your own domain rather than
building on top of it.

`AGENTS.md` has the full breakdown under
[Example scaffolding vs. project infrastructure](AGENTS.md): exactly which files are
scaffolding, which are infrastructure worth keeping, the registrations to clean up
when you delete one, and two things that bite (deleting `index.tsx` leaves `/`
unrouted, and removing a route breaks the typed `<Link>` in `__root.tsx`).

The short version: the `notes` files across `apps/backend/src/`, plus
`apps/frontend/src/api/notes.ts` and `apps/frontend/src/routes/notes.tsx`, are yours
to delete. **Authentication is not scaffolding** — Better Auth, its migration, and
the auth screens are the template. Everything else — the layering, the plugins, the error contract,
the test setup, the typed client, and all three `packages/` — is the template.

## Deploying

```bash
docker build -t backend .              # the API as a self-contained binary
docker build --target migrate -t backend-migrate .   # migrations, run separately
```

Migrations need the Bun runtime rather than the compiled binary, so they ship as a
separate image to run as a job or init container. The server handles `SIGTERM` and
closes the pool, and `/health` checks the database for readiness probes. See
`AGENTS.md` for the details.

The frontend is a static build (`apps/frontend/dist`); set `VITE_API_URL` at build
time.

## Documentation for agents

`AGENTS.md` at the repo root is the entry point and links to per-package docs
(`apps/backend/AGENTS.md`, `apps/frontend/AGENTS.md`, and the package READMEs).
Repo-wide conventions live in `.claude/rules/`.

Claude Code reads `CLAUDE.md` rather than `AGENTS.md`, so each `AGENTS.md` has a
one-line `CLAUDE.md` beside it containing `@AGENTS.md`, which imports it. Both
tools therefore read the same instructions with nothing duplicated. **Write
documentation in `AGENTS.md`; leave the `CLAUDE.md` files as one-line bridges.**

## Troubleshooting

### `turbo watch dev` — daemon connection errors

```
× failed to connect to daemon
╰─▶ server is unavailable: channel closed
```

or

```
× discovery failed: bad grpc status code: The operation was cancelled
```

Run `turbo daemon clean` and try again. If the second error persists, wait a minute and retry.

Related: https://github.com/vercel/turborepo/issues/8491

### The API client has no types / `"Please install Elysia before using Eden"`

The backend's type declarations are missing or stale. The Eden Treaty client is derived
from `apps/backend/dist/*.d.ts`; without them `App` degrades to `any` and calls to
routes that do not exist still compile.

```bash
turbo build
```
