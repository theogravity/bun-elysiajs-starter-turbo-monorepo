# Backend AGENTS.md

Backend-specific documentation for the ElysiaJS API server.

## URLs

- API server: http://localhost:3080
- OpenAPI docs: http://localhost:3080/docs
- PGAdmin: http://localhost:5050

## Commands

### Development

```bash
bun run dev                # Start dev server with watch
bun run test               # Run tests
```

### Building

```bash
bun run build              # Compile TypeScript to dist/
bun run compile            # Create bytecode-compiled binary
bun run prod               # Run production build
```

### Database Migrations

```bash
bun run db:migrate:create  # Create a new migration
bun run db:migrate:latest  # Run all pending migrations
bun run db:migrate:undo    # Rollback last migration
```

## Code Generation (Scaffolding)

Run `turbo gen` from the repo root to access these generators.

### 1. API Route (`api:route`)

Creates a complete REST endpoint with route, schema, and tests.

**Prompts:**
1. Resource folder name (plural, e.g., "users")
2. HTTP method (GET, POST, PUT, DELETE, PATCH)
3. Route path (e.g., "/noun" or "/:id")
4. Operation name (e.g., "createUser")

**Generated files:**
- `src/api/{resource}/{operation-name}.route.ts` - Route with schema and handler
- `src/api/{resource}/__tests__/{operation-name}.test.ts` - Test file
- Updates `src/api/{resource}/index.ts` and `src/api/routes.ts`

### 2. Database Table (`db:table`)

Creates database table with repository, types, and migration.

**Prompts:**
1. Table name (singular, camelCase, e.g., "product")

**Generated files:**
- `src/db/repositories/{table-name}s.repository.ts`
- `src/db/types/{table-name}s.db-types.ts`
- `src/db/migrations/{timestamp}-create-{table-name}s-table.ts`
- Updates type index, repository index, and context injection

### 3. Service (`service`)

Creates a business logic service class.

**Prompts:**
1. Service name (PascalCase, e.g., "UserProfiles")

**Generated files:**
- `src/services/{service-name}.service.ts`
- Updates `src/services/index.ts` and context injection

## Project Architecture

### API Structure

Routes are organized by resource in `src/api/{resource}/`:

```
src/api/
├── users/
│   ├── index.ts                          # Elysia plugin registering all user routes
│   ├── create-email-user.route.ts        # POST /users/email
│   └── __tests__/
│       └── create-email-user.route.test.ts
└── routes.ts                             # Main router registering all resources
```

### Route File Structure

Each route file exports an Elysia instance with schemas and a handler:

```typescript
import { Elysia, t } from "elysia";
import { contextPlugin } from "@/plugins/context.plugin.js";

const CreateUserRequestSchema = t.Object({
  // ... fields with validation
});

const CreateUserResponseSchema = t.Object({
  // ... fields
});

export const createUserRoute = new Elysia()
  .use(contextPlugin)
  .post(
    "/",
    async ({ body, ctx, log }) => {
      // Handler logic - return response directly
      return { id: "..." };
    },
    {
      body: CreateUserRequestSchema,
      response: CreateUserResponseSchema,
      detail: {
        operationId: "createUser",
        tags: ["user"],
        description: "Create a user",
      },
    },
  );
```

Key differences from the Fastify pattern:
- Routes are Elysia instances, not async functions
- `.use(contextPlugin)` is required for `ctx` and `log` type access
- The contextPlugin is a singleton — safe to `.use()` in multiple files
- Handlers return the response directly (no `reply.send()`)
- OpenAPI metadata goes in the `detail` field
- Schemas use `t` from `elysia` (TypeBox-based)

### Resource Registration

Resource index files (`src/api/users/index.ts`) group routes with a prefix:

```typescript
import { Elysia } from "elysia";
import { createUserRoute } from "./create-user.route.js";

export const userRoutes = new Elysia({ prefix: "/users" })
  .use(createUserRoute);
```

The main router (`src/api/routes.ts`) aggregates all resources:

```typescript
import { Elysia } from "elysia";
import { userRoutes } from "./users/index.js";

export const routes = new Elysia()
  .use(apiModels)
  .use(userRoutes);
```

### Service Layer

Services in `src/services/` contain business logic:

```typescript
export class UserProfilesService extends BaseService {
  async updateProfile(userId: string, data: ProfileData) {
    // Business logic here
  }
}
```

Access via `ctx.services.userProfiles` in route handlers.

### Repository Layer

Repositories in `src/db/repositories/` handle database operations:

```typescript
export class UsersRepository extends BaseRepository {
  async createUser(data: NewUser): Promise<UserDb> {...}
  async getUserById(id: string): Promise<UserDb | null> {...}
}
```

### Context Injection

The `contextPlugin` (`src/plugins/context.plugin.ts`) uses `@loglayer/elysia` for request-scoped logging and `.resolve()` to provide an `ApiContext` per request containing:
- Database instance
- All repositories
- All services
- Request-scoped logger

The plugin uses `.as("global")` to propagate types to all consumers.

## Testing

### Overview

Tests use **Vitest** as the test runner with **Testcontainers** to spin up an isolated PostgreSQL database for each test run. This ensures tests run against a real database with all migrations applied.

### Running Tests

```bash
bun run test               # Run all tests
```

### Test Infrastructure

#### Global Setup (`src/test-utils/global-setup.ts`)

Before tests run, the global setup:
1. Starts a PostgreSQL container via Testcontainers
2. Sets database environment variables (`DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`)
3. Runs all migrations against the test database

#### Global Teardown (`src/test-utils/global-teardown.ts`)

After tests complete, containers are stopped and cleaned up.

### Test Utilities

All test utilities are in `src/test-utils/` and imported via `@/test-utils`.

#### `testApi` - Eden Treaty Testing

A pre-configured Eden Treaty client for making type-safe API calls in tests. It wraps the Elysia app instance directly (no network calls):

```typescript
import { testApi } from "@/test-utils/test-server";

const { data, error, status } = await testApi.users.email.post(
  {
    email: "test@example.com",
    password: "pass123",
    givenName: "Test",
    familyName: "User",
  },
  { headers },
);

expect(status).toBe(200);
expect(data?.user.id).toBeDefined();
```

#### `testFramework` - Test Data Generation

The `ApiTestingFramework` class provides methods to generate test fixtures:

```typescript
import { testFramework } from "@/test-utils/test-framework";
```

**`generateTestFacets(params?)`** - Creates a test user and returns headers for authenticated requests:

```typescript
const { user, headers } = await testFramework.generateTestFacets({
  withLogging: true,  // Enable server-side logging for this test
});

// user: The created User object
// headers: Object with test-user-id and test-logging-enabled headers
```

**`generateNewUsers(count)`** - Creates multiple test users:

```typescript
const users = await testFramework.generateNewUsers(5);
```

#### Test Headers

Tests use special `test-` prefixed headers for mocking authentication:

| Header | Purpose |
|--------|---------|
| `test-user-id` | Sets `userId` to simulate authenticated user |
| `test-logging-enabled` | Set to `"true"` to enable server logging for this request |

These headers are processed by test plugins (`src/test-utils/plugins/`) and are only available in the test environment.

### Enabling Logging in Tests

By default, server-side logging is disabled during tests to reduce noise. Enable it when debugging:

**Via `generateTestFacets`:**
```typescript
const { headers } = await testFramework.generateTestFacets({
  withLogging: true,
});
```

### Writing Tests

#### Test File Location

Tests live in `__tests__/` directories alongside the code they test:
```
src/api/users/
├── create-email-user.route.ts
└── __tests__/
    └── create-email-user.route.test.ts
```

#### Complete Example

```typescript
import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { testFramework } from "@/test-utils/test-framework";
import { testApi } from "@/test-utils/test-server";

describe("Create e-mail user API", () => {
  it("should create an e-mail user", async () => {
    const { headers } = await testFramework.generateTestFacets({
      withLogging: true,
    });

    const { data, status } = await testApi.users.email.post(
      {
        givenName: faker.person.firstName(),
        familyName: faker.person.lastName(),
        email: faker.internet.email(),
        password: faker.internet.password(),
      },
      { headers },
    );

    expect(status).toBe(200);
    expect(data?.user.id).toBeDefined();
  });
});
```

### Available Libraries

- **`@faker-js/faker`** - Generate realistic test data (names, emails, etc.)
- **`vitest`** - Test runner, assertions (`describe`, `it`, `expect`, `beforeAll`, `afterAll`)
- **`testcontainers`** - Docker-based test infrastructure
- **`@elysiajs/eden`** - Eden Treaty client for type-safe API testing
