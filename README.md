# Bun ElysiaJS Turbo Monorepo Starter

A starter project for building a full-stack application using **Bun**, TypeScript, ElysiaJS, Kysely with Postgres, and React.

> **This project uses [Bun](https://bun.sh/) as its runtime and package manager.** Bun provides faster installs, native TypeScript execution, and improved performance over Node.js.

## Requirements

- [Bun](https://bun.sh/) >= 1.0.0
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
- Shared error handler package for consistent API error responses.
- Layered backend architecture (routes -> services -> repositories) documented in `apps/backend/AGENTS.md`.

## Packages

| Package | Description |
|---|---|
| `apps/backend` | ElysiaJS API server |
| `apps/frontend` | React frontend (Vite, TanStack Router, TanStack Query, Tailwind CSS) |
| `packages/backend-client` | Type-safe Eden Treaty client generated from the backend |
| `packages/backend-errors` | Shared error types and handler for the backend |
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

3. Copy the example env file:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

4. Start the local Postgres server:
   ```bash
   docker compose up -d
   ```

5. Run database migrations:
   ```bash
   bun run db:migrate:latest
   ```

## Development

```bash
turbo watch dev
```

| Service | URL |
|---|---|
| API server | http://localhost:3080 |
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

const { data, error, status } = await api.users.email.post({
  givenName: 'John',
  familyName: 'Doe',
  email: 'john@example.com',
  password: 'securepass123',
})
```

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
