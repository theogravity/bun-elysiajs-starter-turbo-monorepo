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

## Architecture

The backend is layered, and requests flow in exactly one direction:

```
HTTP request
  └─> route          src/api/**            validation, response shaping
        └─> service   src/services/**       business logic, transactions
              └─> repository  src/db/repositories/**   Kysely queries
                    └─> Postgres
```

Two directories support the layers rather than sitting in the chain:

| Directory | Holds |
|-----------|-------|
| `src/schema/` | Shared Elysia `t` schemas and their inferred types, reused across routes and registered as OpenAPI models via `apiModels` |
| `src/lib/` | Cross-cutting API plumbing — `ApiContext` (the composition root) and the global `errorHandler` |

**The rule: routes call services, services call repositories. A route must never
call a repository directly.** If a route needs data, it asks a service for it, and
the service is responsible for reaching the database.

This is not just a convention — it is enforced by the shape of `ApiContext`
(`src/lib/context.ts`). The context exposes `log` and `services` only.
Repositories are constructed inside `ApiContext.init()` and handed to services;
they are never attached to the context. There is no `ctx.repos` in a route
handler. If you find yourself wanting one, that is the signal to add a service
method instead.

### Layer responsibilities

| Layer | Lives in | May use | Must never |
|-------|----------|---------|------------|
| Route | `src/api/{resource}/` | `ctx.services.*`, `log` | Touch `db`, Kysely, SQL, or a repository; hold business rules |
| Service | `src/services/` | `this.repos.*`, `this.services.*`, `this.db`, `this.log` | Import Elysia types or shape HTTP responses |
| Repository | `src/db/repositories/` | The `db` handle passed into each method | Call another repository or a service; hold business rules |

### Repository layer (`src/db/repositories/`)

Repositories are the only place that talks to the database. One repository per
table, extending `BaseRepository` (which provides `log`).

```typescript
export class UsersRepository extends BaseRepository {
  async createUser({ db, user }: { db: Kysely<Database>; user: NewUser }): Promise<UserDb> {
    return db.insertInto("users").values(user).returningAll().executeTakeFirstOrThrow();
  }

  async getUserById({ db, userId }: { db: Kysely<Database>; userId: string }): Promise<UserDb | undefined> {
    return db.selectFrom("users").selectAll().where("id", "=", userId).executeTakeFirst();
  }
}
```

Note that **every method takes `db` as an explicit parameter** rather than reading
a stored connection. That is deliberate: it lets a service pass a transaction
handle so several repository calls join the same transaction. Keep this pattern
when adding methods.

A repository contains query-builder calls and nothing else — no password hashing,
no permission checks, no orchestration across tables. It never reaches for another
repository or a service; combining entities is the service's job.

### Service layer (`src/services/`)

Services own the business logic and the transaction boundary. They extend
`BaseService`, which provides `log`, `db`, `repos`, and `services`.

```typescript
export class UsersService extends BaseService {
  async createEMailUser({ user, email, password }: { user: NewUser; email: string; password: string }): Promise<UserDb> {
    const pass = await bcrypt.hash(password, 12);

    let u;

    await this.db.transaction().execute(async (db) => {
      u = await this.repos.users.createUser({ db, user });

      await this.repos.userProviders.createUserProvider({
        db,
        userProvider: {
          providerType: UserProviderType.EMail,
          providerAccountId: email,
          passwordAlgo: PasswordAlgo.BCrypt12,
          passwordHash: pass,
          userId: u.id,
        },
      });
    });

    return u;
  }
}
```

This is the layering in miniature: hashing the password is business logic, writing
to two tables atomically is orchestration, and the `db` handle from
`this.db.transaction()` is threaded into each repository call so both writes share
one transaction.

Services may call sibling services through `this.services`. That property is
populated after construction by `withServices()` in `ApiContext.init()`, which is
what lets two services reference each other without a circular constructor
dependency.

Services return domain and DB types. They do not import Elysia, do not set status
codes, and do not build HTTP response bodies.

### Route layer (`src/api/`)

Routes are Elysia instances that validate input, call exactly one service entry
point, and map the result onto the declared response schema.

```typescript
export const createEMailUserRoute = new Elysia().use(contextPlugin).post(
  "/email",
  async ({ body, ctx, log }) => {
    const { familyName, givenName, password, email } = body;

    log?.info(`Creating e-mail user: ${email}`);

    // one call into the service layer — never into ctx.repos
    const user = await ctx.services.users.createEMailUser({
      user: { givenName, familyName },
      email,
      password,
    });

    const response: CreateEMailUserResponse = {
      user: { id: user.id, givenName: user.givenName, familyName: user.familyName },
      provider: { userId: user.id, providerType: UserProviderType.EMail, accountId: email },
    };

    return response;
  },
  {
    body: CreateEMailUserRequestSchema,
    response: CreateEMailUserResponseSchema,
    detail: {
      operationId: "createEMailUser",
      tags: ["user"],
      description: "Create an e-mail-based account",
    },
  },
);
```

Route conventions:

- Routes are Elysia instances, not async functions
- `.use(contextPlugin)` is required for `ctx` and `log` to be typed
- The contextPlugin is a singleton — safe to `.use()` in multiple files
- Handlers return the response directly (no `reply.send()`)
- Schemas use `t` from `elysia` (TypeBox-based) and are declared as named constants
- Keep a schema in the route file when only that route uses it; move it to
  `src/schema/` once a second route or a test needs it, and register it on
  `apiModels` (`src/schema/index.ts`) so it appears as a named OpenAPI model
- OpenAPI metadata goes in the `detail` field
- Map DB rows to the response explicitly; do not return a DB row as-is

### Where does this logic go?

| You want to... | Put it in |
|----------------|-----------|
| Validate the shape of a request body | Route schema (`t.Object({...})`) |
| Reject a request the user is not allowed to make | Service |
| Hash a password, generate a token, compute a derived value | Service |
| Write to two tables atomically | Service (open the transaction, pass `db` down) |
| Add a `WHERE` clause or a join | Repository |
| Convert a DB row into the API response shape | Route |
| Reuse logic across two routes | Service method |
| Reuse a query across two services | Repository method |

### Request context

The `contextPlugin` (`src/plugins/context.plugin.ts`) uses `@loglayer/elysia` for
request-scoped logging and `.resolve()` to build an `ApiContext` per request. The
plugin uses `.as("global")` so the types propagate to every consumer.

`ApiContext.init()` is the composition root: it constructs the repositories,
passes them into the services via `serviceParams`, then calls `withServices()` on
each service. Routes see only `ctx.log` and `ctx.services`.

For work outside a request (scripts, jobs), `getRequestlessContext()` returns a
singleton context with no request-scoped data attached.

### Resource registration

Resource index files (`src/api/users/index.ts`) group routes under a prefix:

```typescript
export const userRoutes = new Elysia({ prefix: "/users" })
  .use(createEMailUserRoute);
```

The main router (`src/api/routes.ts`) aggregates all resources:

```typescript
export const routes = new Elysia()
  .use(apiModels)
  .use(userRoutes);
```

## Adding a feature end-to-end

There is no scaffolding generator — create the files directly, working from the
database outward. Each step names the registration you must not forget.

**1. Table** — add a migration (`bun run db:migrate:create`) and a types file at
`src/db/types/{name}s.db-types.ts`:

```typescript
export interface WidgetsTable {
  id: Generated<string>;
  name: string;
  createdAt: GeneratedAlways<Date>;
}

export type WidgetDb = Selectable<WidgetsTable>;
export type NewWidget = Insertable<WidgetsTable>;
export type WidgetUpdate = Updateable<WidgetsTable>;
```

Register the table on the `Database` interface in `src/db/types/index.ts`.

**2. Repository** — add `src/db/repositories/{name}s.repository.ts` extending
`BaseRepository`, with `db` as an explicit parameter on every method. Add it to
the `Repositories` interface in `src/db/repositories/index.ts` and instantiate it
in `ApiContext.init()`.

**3. Service** — add `src/services/{name}.service.ts` extending `BaseService`. Add
it to the `Services` interface in `src/services/index.ts` and instantiate it in
`ApiContext.init()`.

**4. Route** — add `src/api/{resource}/{operation}.route.ts`, register it in
`src/api/{resource}/index.ts`, and register the resource in `src/api/routes.ts`.
Put any schema shared with another route or a test in `src/schema/` and add it to
`apiModels`.

**5. Test** — add `src/api/{resource}/__tests__/{operation}.route.test.ts` and
drive it through `testApi` (see Testing below).

Skipping a layer is not a shortcut: a route with no service still needs one, even
if the service method only forwards to a single repository call. The indirection
is what keeps business logic out of the HTTP layer as the endpoint grows.

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
