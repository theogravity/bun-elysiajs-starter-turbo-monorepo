# Code Style

## No Dynamic Imports

Do not use `await import(...)` (dynamic imports) anywhere in the codebase. Always use static
top-level `import` statements instead.

**Do this:**
```typescript
import { db } from "@/db/index.js";
import { ApiContext } from "@/lib/context.js";
```

**Not this:**
```typescript
const { db } = await import("@/db/index.js");
const { ApiContext } = await import("@/lib/context.js");
```

Dynamic imports break `bun build --compile` because the bundler cannot statically analyse
them, so the referenced modules (and their `node_modules` dependencies) are excluded from the
compiled binary and fail at runtime with "Cannot find package" errors.

## Import Extensions

The two apps have **opposite** rules, set by their `moduleResolution`:

- **Backend** (`node16`): every relative and aliased import ends in `.js`, even though the
  file is `.ts` — `import { db } from "@/db/index.js"`
- **Frontend** (`bundler`): no extension — `import { api } from "@/lib/api"`

`@/` maps to `src/` in both. Copying an import line from one app into the other will not
resolve. This is the single most common first-edit mistake in this repo.

## File Size and Organization

Break up large files into smaller, focused modules. When a file grows beyond ~300-400 lines or contains multiple distinct concerns, split it into separate files.

When the split files share a common theme, create a directory to group them:

```
# Before: One large file
src/services/billing.service.ts  (700+ lines)

# After: Directory with focused modules
src/services/
├── billing.service.ts          # Main service class (thin wrapper)
└── billing/
    ├── invoices.ts             # Invoice generation
    ├── proration.ts            # Proration maths
    ├── types.ts                # TypeScript interfaces
    └── __tests__/
        └── proration.test.ts
```

Guidelines:
- Each file should have a single responsibility
- Keep related tests alongside the code in `__tests__/` directories
- Use an `index.ts` only when you need to aggregate exports for external use
- Do not re-export items that are already accessible from their original location; import directly from the source instead

## React Component Organization

Route files and large components should be thin orchestrators. When a route component grows beyond ~200 lines, extract concerns into separate modules:

- **Data-fetching logic** → custom hooks in `src/hooks/` (e.g., `useUsers.ts`)
- **Reusable UI blocks** → components in `src/components/` (e.g., `UserTable.tsx`)
- **Shared types, constants, and query options** → `src/lib/`

Route files should only contain:
- The route definition (`createFileRoute` + `validateSearch`)
- URL state parsing and the `updateSearch` helper
- Event handlers that are tightly coupled to route-level state
- The top-level JSX composition

## Deduplication and Reuse

Avoid duplicating code. When the same logic, type, or utility exists in multiple places, consolidate it into a shared location and import from there.

- Extract shared types to common type files
- Create utility functions for repeated patterns
- Use a single source of truth for constants and configurations
- When adding new code, first check if similar functionality already exists

## Type Discriminants and Enums

Use TypeScript union types or enums for values with a fixed set of options instead of plain strings. Define these in shared type files for reuse.

**Do this:**
```typescript
// Database-facing enums live next to the table types
export enum UserProviderType {
  EMail = "EMail",
}

interface UserProviderInput {
  providerType: UserProviderType;  // Type-safe, autocomplete-friendly
}
```

**Not this:**
```typescript
interface UserProviderInput {
  providerType: string;  // Any string accepted, no validation
}
```

For the API surface, mirror the enum with an Elysia schema in `src/schema/enums.type.ts`.
Do **not** use `t.Enum` — it produces poor OpenAPI output and weak client types:

```typescript
import { t } from "elysia";
import { UserProviderType } from "@/db/types/user-providers.db-types.js";

export const UserProviderTypeSchema = t.String({
  enum: Object.values(UserProviderType),
  title: "Auth provider type",
  description: "The type of the auth provider",
});
```

## Schema Definitions

Define all schemas as named constants rather than inline definitions. This improves readability,
enables reuse, and keeps route definitions scannable.

**Do this:**
```typescript
/** Query parameters for listing users */
const ListUsersQuerySchema = t.Object({
  limit: t.Optional(t.Number({ default: 25, description: "Maximum number of users to return" })),
  offset: t.Optional(t.Number({ default: 0, description: "Number of users to skip" })),
});

/** Successful response body */
const ListUsersResponseSchema = t.Object({
  users: t.Array(UserSchema, { description: "The requested page of users" }),
  total: t.Number({ description: "Total number of users, ignoring pagination" }),
});

export const listUsersRoute = new Elysia().use(contextPlugin).get("/", handler, {
  query: ListUsersQuerySchema,
  response: { 200: ListUsersResponseSchema },
});
```

**Not this:**
```typescript
export const listUsersRoute = new Elysia().get("/", handler, {
  query: t.Object({  // Inline schema — hard to read and impossible to reuse
    limit: t.Optional(t.Number()),
  }),
});
```

## Elysia Schema Descriptions

All Elysia `t` schema properties in API routes must include a `description` field. These descriptions are used to generate OpenAPI documentation and appear in the auto-generated client SDK.

Use `import { t } from "elysia"` for all schema definitions.

This applies to:
- Query parameter schemas (`querystring`)
- Path parameter schemas (`params`)
- Request body schemas (`body`)
- Response schemas (`response`)
- Nested object properties within any schema

## Reference Models

A schema used by more than one route or test belongs in `src/schema/` and is registered on
`apiModels` (`src/schema/index.ts`) so it becomes a named, shared OpenAPI component rather
than a copy inlined into each route.

The mechanics — how a name reference resolves, where `apiModels` has to be applied, and what
breaks when it is not — are documented once in **`apps/backend/AGENTS.md`** under "Schemas and
reference models". Do not restate them here; this file has already drifted from that section
once.

## Co-location of Related Definitions

Keep all definitions for a single concept in the same file. A route's schemas, its inferred
types, and the route itself belong together rather than spread across files.

**Do this:**
```typescript
// api/users/get-user.route.ts — everything for this route in one place

const GetUserParamsSchema = t.Object({
  userId: t.String({ format: "uuid", description: "ID of the user to fetch" }),
});

export type GetUserParams = typeof GetUserParamsSchema.static;

const GetUserResponseSchema = t.Object({ user: UserSchema });

export type GetUserResponse = typeof GetUserResponseSchema.static;

export const getUserRoute = new Elysia().use(contextPlugin).use(apiModels).get(
  "/:userId",
  handler,
  {
    params: GetUserParamsSchema,
    response: { 200: GetUserResponseSchema, 404: "ApiErrorResponse" },
    detail: { operationId: "getUser", tags: ["user"], description: "Fetch a single user by ID" },
  },
);
```

Aggregate in an index file only when something external needs the collection:
```typescript
// api/users/index.ts
export const userRoutes = new Elysia({ prefix: "/users" })
  .use(createEMailUserRoute)
  .use(listUsersRoute)
  .use(getUserRoute);
```

## Method Chaining

Elysia's type inference depends on unbroken method chaining. Never split a chain
across statements — the types degrade silently, with no error:

```typescript
const app = new Elysia();
app.use(contextPlugin);   // wrong: type information is lost here
app.get("/", handler);
```

## Implicit `any`

`noImplicitAny` is on. Beyond the usual benefits, it is what makes a missing type
declaration in the workspace a hard error rather than a silently untyped value — see
`build.md`. Do not reach for `any` to silence it; type the value, or use `unknown` and
narrow.

Explicit `any` is still allowed (Biome's `noExplicitAny` is off), because a few places
genuinely need it: `Kysely<any>` in migrations, which must stay frozen against the
schema at the time they were written; `causedBy` in `ApiError`, which accepts anything
throwable; and casts where a third-party type is missing or too narrow. Comment those
at the call site so the next reader knows it was deliberate rather than lazy.

## JSDoc Comments

All public classes, methods, and functions should have JSDoc comments that describe:
- What the class/function does
- Parameters and their purpose
- Return values
- Errors thrown, for anything that raises an `ApiError`

```typescript
/**
 * Fetches a single user.
 *
 * Returns `undefined` rather than raising when the user does not exist. Mapping
 * that outcome onto an HTTP status is the route's job.
 *
 * @param userId - ID of the user to fetch
 * @returns The user record, or `undefined` if no user has that ID
 */
async getUserById({ userId }: { userId: string }): Promise<UserDb | undefined> {
  // ...
}
```

## Returning Errors, Not Throwing Them

Expected failures are **returned** from a route, never thrown, and
`throw new Error()` is never correct:

```typescript
if (!user) {
  return status(404, apiErrorBody({ code: BackendErrorCodes.NOT_FOUND_ERROR }));
}
```

Why, when to throw instead, and the available codes are documented once in
`apps/backend/AGENTS.md` under "Error handling".

## Interface Property Documentation

All interface properties should have JSDoc comments explaining their purpose. This is especially important for:
- Database table schemas
- API request/response types
- Configuration interfaces
- Domain models

```typescript
/**
 * Database table schema for users.
 */
export interface UsersTable {
  /** Unique identifier (UUID v4) */
  id: Generated<string>;
  /** The user's first name */
  givenName: string;
  /** Set by the database on insert */
  createdAt: GeneratedAlways<Date>;
}
```

For simple, self-explanatory properties (like `id`, `name`, `createdAt`), a brief comment is sufficient. For complex or non-obvious properties, provide more context about the expected format, constraints, or usage.

## Singleton Pattern for Expensive Resources

For expensive resources that should only be created once (servers, database connections, etc.), use a module-level singleton pattern with a factory function:

```typescript
let instance: ExpensiveResource | null = null;

/**
 * Returns the singleton instance, creating it on first call.
 */
export function createExpensiveResource(deps: Dependencies): ExpensiveResource {
  if (instance) {
    return instance;
  }

  instance = new ExpensiveResource(deps);

  return instance;
}

/**
 * Resets the singleton. Only use in tests.
 * @internal
 */
export function resetExpensiveResource(): void {
  instance = null;
}
```

Key points:
- The factory function checks for an existing instance before creating
- Provide a reset function for test isolation (marked `@internal`)
- Tests should call reset in `beforeEach`/`afterEach` to ensure isolation

`getRequestlessContext()` in `apps/backend/src/lib/context.ts` is an example of this pattern.
