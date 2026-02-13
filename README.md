# Bun ElysiaJS Turbo Monorepo Starter

A starter project for building an API server using **Bun**, Typescript, ElysiaJS, and Kysely with Postgres.

> **This project uses [Bun](https://bun.sh/) as its runtime and package manager.** Bun provides faster installs, native TypeScript execution, and improved performance over Node.js.

## Requirements

- [Bun](https://bun.sh/) >= 1.0.0
- [Docker](https://docs.docker.com/engine/install/) (for local Postgres and testing)

## Features

- **Bun-powered** - Uses Bun for package management, script execution, and runtime.
- ElysiaJS with Typescript.
- Monorepo setup using [`turbo`](https://turbo.build/) and [Bun workspaces](https://bun.sh/docs/install/workspaces).
- OpenAPI docs via Scalar UI at `/docs`.
- Type-safe client SDK via Eden Treaty.
- A sample REST test is included using Vitest.
- Sample database migrations / repositories are included using Kysely.
- An error handler package is included to handle errors and return a consistent response.
- Code generators using `turbo gen` to create new API endpoints and database tables.

## Libraries and tools used

- [`typescript`](https://www.typescriptlang.org/)
- [`bun`](https://bun.sh/) for package management and runtime
- [`commitlint`](https://commitlint.js.org/) for commit message linting
- [`turbo`](https://turbo.build/) for monorepo management
- [`elysia`](https://elysiajs.com/) for the API server framework
- [`@elysiajs/openapi`](https://elysiajs.com/plugins/openapi) for OpenAPI docs (Scalar UI)
- [`@elysiajs/eden`](https://elysiajs.com/eden/overview) for type-safe API client (Eden Treaty)
- [`hash-runner`](https://github.com/theogravity/hash-runner) for caching builds
- [`kysely`](https://kysely.dev/) for the database query builder
- [`postgres`](https://www.postgresql.org/) + pgAdmin for the database
- [`testcontainers`](https://www.testcontainers.org/) for testing with a sandboxed postgres instance
- [`vitest`](https://vitest.dev/) for endpoint testing
- [`loglayer`](https://github.com/theogravity/loglayer) + [`@loglayer/elysia`](https://loglayer.dev/integrations/elysia) for request-scoped logging
- [`biome`](https://biomejs.dev/) for linting and formatting
- [`syncpack`](https://jamiemason.github.io/syncpack/) for keeping package versions in sync

## Setup

1. Install Bun (if not already installed):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Copy `apps/backend/.env.example` to `apps/backend/.env`

Start local postgres server:

`docker compose up -d`

Perform database migrations:

`bun run db:migrate:latest`

## Development

`turbo watch dev`

- API server: http://localhost:3080
- OpenAPI docs: http://localhost:3080/docs
- PGAdmin: http://localhost:5050

## Testing

Make sure docker is running as it uses `testcontainers` to spin up a
temporary postgres database.

`turbo test`

## Build

`turbo build`

## Generate scaffolding

Generators for the following:

- New API endpoints + tests
- Database tables and repositories

`turbo gen`

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

- Create a migration: `bun run db:migrate:create`
- Run migrations: `bun run db:migrate:latest`
- Rollback migrations: `bun run db:migrate:undo`

## Update all dependencies

`bun run syncpack:update`

## Troubleshooting

### turbo watch dev failing

```
• Packages in scope: @internal/backend, @internal/backend-client, @internal/backend-errors, @internal/tsconfig
• Running dev in 4 packages
• Remote caching disabled
  × failed to connect to daemon
  ╰─▶ server is unavailable: channel closed
```

Try:

`turbo daemon clean`

Then try running `turbo watch dev` again.

If you get:

```
• Packages in scope: @internal/backend, @internal/backend-client, @internal/backend-errors, @internal/tsconfig
• Running dev in 4 packages
• Remote caching disabled
  × discovery failed: bad grpc status code: The operation was cancelled
```

Wait a few minutes and try again.

Related:

- https://github.com/vercel/turborepo/issues/8491
