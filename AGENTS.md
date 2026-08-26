# AGENTS.md

This document describes how this project works and how to perform common operations.

## Project Overview

This is a **Bun-powered TypeScript monorepo** using Turborepo for orchestration. It contains an ElysiaJS API backend, a React frontend, and a type-safe Eden Treaty client SDK.

### Directory Structure

```
bun-elysiajs-starter-turbo-monorepo/
├── apps/
│   ├── backend/                    # ElysiaJS API server
│   └── frontend/                   # React frontend (Vite, TanStack Router, TanStack Query, Tailwind CSS)
├── packages/
│   ├── tsconfig/                   # Shared TypeScript configuration
│   ├── backend-errors/             # Error handling package
│   └── backend-client/             # Eden Treaty client SDK
├── turbo.json                      # Turbo task configuration
├── package.json                    # Root workspace definition
├── biome.json                      # Linting and formatting
└── lefthook.yml                    # Git hooks
```

### Technology Stack

- **Runtime**: Bun (>= 1.4.0)
- **Backend Framework**: ElysiaJS
- **Frontend**: React 19, Vite, TanStack Router, TanStack Query, Tailwind CSS
- **Database**: PostgreSQL with Kysely (type-safe query builder)
- **Validation**: Elysia's `t` module (TypeBox-based, generates OpenAPI schemas)
- **Logging**: LogLayer + @loglayer/elysia (request-scoped logging)
- **API Docs**: @elysiajs/openapi (Scalar UI at /docs)
- **Client SDK**: Eden Treaty (type-safe, no code generation)
- **Testing**: Vitest + Testcontainers
- **Linting/Formatting**: Biome
- **Monorepo**: Turborepo + Bun workspaces

## Common Commands

### Development

```bash
bun run start              # Start dev mode with watch (turbo watch dev)
turbo watch dev            # Same as above
```

### Building

```bash
turbo build                # Build all packages
```

### Testing

```bash
turbo test                 # Run tests across all packages
```

### Linting and Formatting

```bash
turbo run lint             # Lint all packages
turbo run verify-types     # Type check all packages

# Format specific files
biome check --write --unsafe src
```

### Cleaning

```bash
bun run clean              # Remove node_modules, turbo cache, dist, .hashes.json
bun run clean:turbo        # Remove .turbo directories only
bun run clean:dist         # Remove dist directories only
```

## Backend Architecture

The backend is layered and requests flow in one direction:

```
route (src/api/**) -> service (src/services/**) -> repository (src/db/repositories/**) -> Postgres
```

**Routes call services; services call repositories. Routes never call
repositories directly.** `ApiContext` exposes only `log` and `services`, so a
route handler has no path to a repository — needing one means a service method is
missing.

See `apps/backend/AGENTS.md` for the full breakdown of each layer, where a given
piece of logic belongs, and how to add a feature end-to-end.

## Build Dependencies

The Turbo pipeline ensures correct build order:

1. `@internal/backend-errors` builds first
2. `@internal/backend` depends on backend-errors
3. `@internal/backend-client` depends on backend (imports the `App` type for Eden Treaty)
4. `apps/frontend` depends on backend-client

For development, `build:dev` tasks use `hash-runner` for incremental builds — only rebuilding when source inputs change.

## Package Synchronization

Keep dependencies in sync across packages:

```bash
bun run syncpack:update    # Update all dependencies
bun run syncpack:format    # Format package.json files
bun run syncpack:lint      # Check for version mismatches
```

## Git Hooks (Lefthook)

**Pre-commit:**
- Formats package.json files
- Runs `turbo run lint:staged` on staged TypeScript files

**Pre-push:**
- Runs type checking (`turbo run verify-types`)
- Runs full lint (`turbo run lint`)
