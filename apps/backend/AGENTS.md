# Backend AGENTS.md

Backend-specific documentation for the ElysiaJS API server.

See the root `AGENTS.md` for monorepo-wide commands and build ordering.

> **The `notes` resource is example scaffolding, not the domain.** It exists to show
> the layering end to end and how application data hangs off an authenticated user.
> Every `notes` file — migration, table types, repository, service, routes, tests —
> is meant to be replaced. Follow its patterns; do not extend it unless the task is
> actually about notes. Authentication is *not* scaffolding: Better Auth and its
> migration stay. See
> [Example scaffolding vs. project infrastructure](../../AGENTS.md) for the full list
> and what to keep.

## URLs

- API server: http://localhost:3080
- OpenAPI docs: http://localhost:3080/docs
- Readiness: http://localhost:3080/health — checks the database. `GET /` is a
  cheaper liveness check that only proves the process is up.
- PGAdmin: http://localhost:5050

## Commands

```bash
bun run dev                # Start dev server with watch
bun run test               # Run all tests
bun run test path/to.test.ts   # Run a single test file
bun run test -t "substring"    # Run tests whose name matches
bun run verify-types       # Type check (includes tests and test-utils)
bun run lint               # Biome check + autofix
bun run build              # Compile to dist/ (JS + .d.ts)
bun run compile            # Bytecode-compiled single binary
bun run prod               # Run the compiled build
```

### Database migrations and seeds

```bash
bun run db:migrate:create  # Create a new migration
bun run db:migrate:latest  # Run all pending migrations
bun run db:migrate:undo    # Roll back the last migration
bun run db:seed:create     # Scaffold a seed
bun run db:seed:run        # Run seeds
bun run auth:schema        # Check the DB against what Better Auth expects
```

## Conventions you will get wrong if you don't read this

These four are not guessable from the surrounding code and are the most common
source of broken first attempts.

### 1. Imports need a `.js` extension

`tsconfig.json` sets `moduleResolution: node16`, so **every relative and aliased
import must end in `.js`**, even though the file on disk is `.ts`:

```typescript
import { db } from "@/db/index.js";          // correct
import { db } from "@/db/index";             // fails to resolve
```

`@/` is aliased to `src/`. Bare package imports (`elysia`, `kysely`) take no
extension. The frontend uses `moduleResolution: bundler` and the opposite rule —
no extensions there.

### 2. The database is snake_case, the TypeScript is camelCase

`src/db/index.ts` registers Kysely's `CamelCasePlugin`. It translates in both
directions at query time, so:

- **Migrations** declare snake_case columns: `user_id`, `created_at`
- **Table interfaces and query builders** use camelCase: `userId`, `createdAt`

```typescript
// migration
.addColumn("user_id", "text", (col) => col.notNull())

// src/db/types/notes.db-types.ts
export interface NotesTable {
  userId: string;
}

// repository — camelCase here too, the plugin rewrites it
db.selectFrom("notes").where("userId", "=", userId).orderBy("createdAt", "desc")
```

This applies to Better Auth's tables too: `src/lib/auth.ts` maps its fields to
snake_case so they behave the same way. See [Authentication](#authentication).

Getting this backwards fails at runtime, not at compile time. There is no type
error for a column name that does not exist in the database.

### 3. Validation failures come back as 400, not 422

Elysia natively returns 422 for a schema validation failure. The global error
handler rewrites it into the standard error body with a 400 status and the
`INPUT_VALIDATION_ERROR` code, so clients only ever parse one error shape. Assert
400 in tests.

### 4. Failures are returned, not thrown

`return status(404, apiErrorBody({ ... }))` — not `throw`. Only a returned status
is checked against the route's `response` schema and narrowed by status code for
client code. Throwing is reserved for genuinely unexpected failures. There is
exactly one error body shape across the whole API. See
[Error handling](#error-handling).

## Architecture

The backend is layered, and requests flow in exactly one direction:

```
HTTP request
  └─> route          src/api/**            validation, response shaping
        └─> service   src/services/**       business logic, transactions
              └─> repository  src/db/repositories/**   Kysely queries
                    └─> Postgres
```

Three directories support the layers rather than sitting in the chain:

| Directory | Holds |
|-----------|-------|
| `src/schema/` | Shared Elysia `t` schemas and their inferred types, registered as named OpenAPI models via `apiModels` |
| `src/plugins/` | Elysia plugins — `contextPlugin` (per-request `ctx`/`log`) and `errorHandlerPlugin` (global `onError`) |
| `src/lib/` | `ApiContext` (the composition root wiring repositories into services) and `apiErrorBody` |

**The rule: routes call services, services call repositories. A route must never
call a repository directly.** If a route needs data, it asks a service for it, and
the service is responsible for reaching the database.

This is not just a convention — it is enforced by the shape of `ApiContext`
(`src/lib/context.ts`). The context exposes `log` and `services` only.
Repositories are constructed inside `ApiContext` and handed to services; they are
never attached to the context. There is no `ctx.repos` in a route handler. If you
find yourself wanting one, that is the signal to add a service method instead.

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

Return `undefined` for a missing row (`executeTakeFirst`). Deciding that a missing
row is an error is the service's call, not the repository's.

### Service layer (`src/services/`)

Services own the business logic and the transaction boundary. They extend
`BaseService`, which provides `log`, `db`, `repos`, and `services`.

```typescript
export class NotesService extends BaseService {
  /**
   * Ownership lives here, not in the route: it is a business rule, so every caller
   * gets it. Returning `undefined` for "not yours" as well as "no such note" avoids
   * telling a caller that someone else's note exists.
   */
  async getOwnedNote({ userId, noteId }: { userId: string; noteId: string }): Promise<NoteDb | undefined> {
    const note = await this.repos.notes.getNoteById({ db: this.db, noteId });

    if (!note || note.userId !== userId) {
      return undefined;
    }

    return note;
  }
}
```

When several writes must be atomic, open a transaction and thread the `db` handle
into each repository call:

```typescript
// `execute()` resolves to whatever the callback returns. Assigning to an outer
// `let` instead would type the result as `T | undefined`, since the compiler
// cannot prove the callback ran.
const note = await this.db.transaction().execute(async (db) => {
  const created = await this.repos.notes.createNote({ db, note });
  await this.repos.auditLog.record({ db, event: "note.created", noteId: created.id });

  return created;
});
```

That is the layering in miniature: deciding what a user may see is business logic,
writing to two tables atomically is orchestration, and the `db` handle threads
through so both writes share one transaction.

Services may call sibling services through `this.services`. That property is
populated after construction by `withServices()` in `ApiContext`, which is what
lets two services reference each other without a circular constructor dependency.

Services return domain and DB types. They do not import Elysia, do not set status
codes, and do not build HTTP response bodies. To signal a failure they return a
domain outcome — `undefined` for a missing row, or a discriminated result for
something richer — and the route maps it onto a status. See
[Error handling](#error-handling).

### Route layer (`src/api/`)

Routes are Elysia instances that validate input, call exactly one service entry
point, and map the result onto the declared response schema.

```typescript
export const getNoteRoute = new Elysia().use(contextPlugin).use(authPlugin).use(apiModels).get(
  "/:noteId",
  async ({ params, ctx, user, log, status }) => {
    log?.withMetadata({ userId: user.id, noteId: params.noteId }).info("Fetching note");

    // The user id comes from the session, never from the request.
    const note = await ctx.services.notes.getOwnedNote({ userId: user.id, noteId: params.noteId });

    // Return the failure; do not throw it. See Error handling below.
    if (!note) {
      return status(404, apiErrorBody({ code: BackendErrorCodes.NOT_FOUND_ERROR }));
    }

    const response: GetNoteResponse = {
      note: { id: note.id, title: note.title, body: note.body, createdAt: note.createdAt.toISOString() },
    };

    return response;
  },
  {
    auth: true,
    params: GetNoteParamsSchema,
    response: {
      200: GetNoteResponseSchema,
      401: "ApiErrorResponse",
      404: "ApiErrorResponse",
    },
    detail: {
      operationId: "getNote",
      tags: ["note"],
      description: "Fetch one of the signed-in user's notes",
    },
  },
);
```

Route conventions:

- Routes are Elysia instances, not async functions. Elysia's type inference
  depends on unbroken method chaining — never split a chain across statements.
- `.use(contextPlugin)` is required for `ctx` and `log` to be typed
- `.use(apiModels)` makes registered models resolvable by name. `src/api/routes.ts`
  already applies it to the whole tree, so a route works without its own `.use()`;
  adding it keeps the route file self-contained and costs nothing
- Both plugins are named, so Elysia deduplicates them — `.use()` them freely
- Handlers return the response directly
- Schemas use `t` from `elysia` and are declared as named constants, never inline
- Every schema property needs a `description` — it becomes the OpenAPI docs
- Map DB rows onto the response explicitly; returning a row as-is leaks columns
- OpenAPI metadata goes in `detail`, including a unique `operationId`

### Schemas and reference models

Keep a schema in the route file when only that route uses it. Once a second route
or a test needs it, move it to `src/schema/` and register it on `apiModels`
(`src/schema/index.ts`).

Registered models can be referenced **by name** in the top-level `body`, `query`,
`params`, and `response` slots. This is Elysia's recommended practice: it emits a
`$ref` to a shared OpenAPI component instead of inlining a copy of the schema into
every route.

```typescript
response: {
  200: GetUserResponseSchema,   // route-local, inlined
  404: "ApiErrorResponse",      // registered model, emitted as a $ref
}
```

Name references only work at the top level of a slot. A schema nested inside a
`t.Object` must be the imported constant (`user: UserSchema`) — that is why the
`200` schemas above are inlined in the OpenAPI output while the `404` is a `$ref`.

`apiModels` must be applied somewhere in the composed app — on the route instance
or any ancestor. `src/api/routes.ts` applies it globally, so this is already true
for every route. **If it is registered nowhere, the failure is quiet and nasty:**
the OpenAPI document still emits `$ref: "#/components/schemas/ApiErrorResponse"`
but `components.schemas` is empty, so the reference dangles, and the route's
response types collapse to `{}`.

If the model list grows, adopt Elysia's namespaced naming (`user.list`,
`user.create`) to avoid collisions.

For enums, do not use `t.Enum` — it produces poor client and OpenAPI types. Use
`t.String({ enum: Object.values(MyEnum) })`, as `src/schema/enums.type.ts` does.

## Error handling

Every failure produces the same body, described by `ApiErrorResponseSchema`
(`src/schema/error.type.ts`) and registered as the `ApiErrorResponse` model. There
are two ways to produce one, and the choice is not stylistic.

### Expected failures: return `status()`

For a failure the endpoint is designed to produce — a missing row, a duplicate, a
forbidden action — **return it, do not throw**. This is Elysia's documented
recommendation, and it is the only form that gets you:

- the body checked against the route's `response` schema at compile time
- the error narrowed by status code for Eden Treaty clients, so
  `error.value.code` is typed rather than `unknown`

```typescript
import { BackendErrorCodes } from "@internal/backend-errors";
import { apiErrorBody } from "@/lib/api-error.js";

async ({ params, ctx, status }) => {
  const user = await ctx.services.users.getUserById({ userId: params.userId });

  if (!user) {
    return status(
      404,
      apiErrorBody({
        code: BackendErrorCodes.NOT_FOUND_ERROR,
        message: "No user exists with that ID",
        metadataSafe: { userId: params.userId },
      }),
    );
  }

  // `user` is narrowed to non-undefined from here
}
```

The status literal appears twice — in `status(404, ...)` and in the `response` map
— and that is deliberate: the schema is what makes the first one type-checked.

`apiErrorBody` (`src/lib/api-error.ts`) builds the body. A returned status does
**not** pass through `onError`, so the helper takes over the global handler's two
other jobs: logging the failure with its `errId`, and choosing the
production-safe serialization. It logs at `debug` by default, because an expected
4xx is not a server fault; pass `logLevel` to raise it.

**Which layer decides?** The service returns a domain outcome — `undefined` for a
missing row, or a discriminated result for something richer. The route maps that
outcome onto a status. This keeps services free of HTTP concerns entirely, which
is the same rule as everywhere else in the layering. If two routes need the same
mapping, that is a sign the service should return a richer result the routes can
both switch on, not that the service should start throwing.

### Unexpected failures: throw

Throwing is the escape hatch for what the endpoint is *not* designed to produce —
a violated invariant, a dependency that failed in a way the caller cannot act on,
or a failure raised deep in a call chain where threading a result back would
obscure the code. `throwApiError` raises an `ApiError`, which the global handler
catches and serializes identically:

```typescript
import { BackendErrorCodes, throwApiError } from "@internal/backend-errors";

throwApiError({
  code: BackendErrorCodes.INTERNAL_SERVER_ERROR,
  message: "Ledger and cache disagree after write",
  metadata: { ledgerId, cacheId },   // logged, never sent to the client
  isInternalError: true,
});
```

`throwApiError` returns `never`, so TypeScript narrows after the call without a
cast. A thrown error does not appear in the route's `response` schema, so it is
invisible to Eden and to the OpenAPI document — which is the right outcome for a
failure that is not part of the endpoint's contract.

**Never `throw new Error()`.** It produces a generic 500 with no code for the
client to branch on.

### Codes and options

The code determines the HTTP status. `apiErrorBody` and `throwApiError` take the
same options — the important one is `metadataSafe` (returned to the client) versus
`metadata` (logged only, never serialized out).

The full code-to-status table and every option are documented next to the enum, in
[`packages/backend-errors/README.md`](../../packages/backend-errors/README.md). Do
not restate them here; a copy of that table will drift from the enum.

### The error handler (`src/plugins/error-handler.plugin.ts`)

The global `onError` still catches everything that *is* thrown: `ApiError`,
Elysia's own `VALIDATION` failures, and anything unexpected. It produces the same
body shape as `apiErrorBody`.

**Gotcha:** Elysia's documented pattern for custom errors is to register the class
with `.error({ API_ERROR: ApiError })` and switch on the narrowed `code` in
`onError`. **That does not work here.** Elysia derives `code` from the thrown
error's own `code` property when it has one, and `ApiError.code` is already a
`BackendErrorCodes` value that we deliberately expose on the wire. Registering the
class yields `code === "NOT_FOUND_ERROR"`, never `"API_ERROR"`, and the switch
falls through to the 500 branch. The handler therefore discriminates with
`error instanceof ApiError`, and that check must come before any check on `code`.

## Environment variables

Copy `.env.example` to `.env`. `src/constants.ts` reads and validates them at
import time; a missing required variable throws on boot.

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DB_HOST` | yes | — | Postgres host |
| `DB_NAME` | yes | — | Postgres database name |
| `DB_USER` | yes | — | Postgres user |
| `DB_PASS` | yes | — | Postgres password |
| `DB_PORT` | no | `5432` | Postgres port |
| `SERVER_PORT` | no | `3080` | Port the API listens on |
| `BACKEND_LOG_LEVEL` | no | `debug` | LogLayer level |
| `BETTER_AUTH_SECRET` | yes | — | Signs session cookies. `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | no | `http://localhost:3080` | Public origin of this API |
| `FRONTEND_URL` | no | `http://localhost:5173` | Origin allowed to send credentialed requests |
| `SEED_ADMIN_EMAIL` | no | `admin@example.com` | Bootstrap admin created by `db:seed:run` |
| `SEED_ADMIN_PASSWORD` | no | `changeme12345` | Bootstrap admin password |

`NODE_ENV` drives `IS_PROD` and `IS_TEST`. Tests do not read `.env` — the
Testcontainers global setup injects the database variables before anything reads
them, which is why a missing `.env` is not an error during a test run. dotenvx's
`MISSING_ENV_FILE` warning is suppressed for the same reason; a genuinely missing
variable still fails, with a message naming the variable and pointing at
`.env.example`.

Every `db:migrate:*` command loads this module too, so all three need the
variables set even though `create` writes no SQL.

To add a variable, export it from `src/constants.ts` and add it to `.env.example`
and to the table above. Use the local `required()` helper for anything mandatory —
it reports a missing variable by name and points at `.env.example`, rather than
surfacing a bare `EnvVarError`. Optional variables use `env.get(...).default(...)`
directly. Read them at module scope, never inside a handler, so a misconfigured
deployment fails at boot instead of on the first request.

## Adding a feature end-to-end

There is no code generator — create the files directly, working from the database
outward. Each step names the registration you must not forget.

`src/api/notes/` is a complete worked example: a POST, a paginated list, and a
fetch-by-id with a 404, all behind a session. Read it for the shape, then write your own resource. It is
example scaffolding, so replacing it is expected; adding another resource alongside
it is not a goal in itself.

**1. Migration** — `bun run db:migrate:create <name>` writes
`src/db/migrations/{unixMillis}_{name}.ts`. It needs `.env` to exist even though it
writes no SQL. Columns are snake_case:

```typescript
export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("widgets")
    .addColumn("id", "uuid", (col) => col.defaultTo(sql`gen_random_uuid()`).primaryKey())
    .addColumn("owner_id", "uuid", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) => col.defaultTo(sql`now()`))
    .addForeignKeyConstraint("fk_owner_id", ["owner_id"], "users", ["id"], (cb) => cb.onDelete("cascade"))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("widgets").execute();
}
```

`down` must undo everything `up` did, including indexes and enum types. See
`src/db/migrations/README.md` for the enum pattern.

**2. Table types** — `src/db/types/widgets.db-types.ts`, camelCase, one JSDoc line
per property:

```typescript
export interface WidgetsTable {
  /** Unique identifier (UUID v4) */
  id: Generated<string>;
  /** ID of the user who owns the widget */
  ownerId: string;
  /** Set by the database on insert */
  createdAt: GeneratedAlways<Date>;
}

export type WidgetDb = Selectable<WidgetsTable>;
export type NewWidget = Insertable<WidgetsTable>;
export type WidgetUpdate = Updateable<WidgetsTable>;
```

Register the table on the `Database` interface in `src/db/types/index.ts`.

**3. Repository** — `src/db/repositories/widgets.repository.ts` extending
`BaseRepository`, with `db` as an explicit parameter on every method. Add it to
the `Repositories` interface in `src/db/repositories/index.ts` **and** instantiate
it in `ApiContext` (`src/lib/context.ts`).

**4. Service** — `src/services/widgets.service.ts` extending `BaseService`. Add it
to the `Services` interface in `src/services/index.ts` **and** instantiate it in
`ApiContext`.

**5. Route** — `src/api/widgets/{operation}.route.ts`, registered in
`src/api/widgets/index.ts`, and the resource registered in `src/api/routes.ts`.
Put any schema shared with another route or a test in `src/schema/` and add it to
`apiModels`.

Unless the endpoint is genuinely public, add `.use(authPlugin)` and `auth: true`,
take the owner from `user.id` rather than from the request, and declare
`401: "ApiErrorResponse"` in the response map. See [Authentication](#authentication).

**6. Test** — `src/api/widgets/__tests__/{operation}.route.test.ts` driven through
`testApi`. Migrations are applied automatically by the global setup, so a new
migration needs no test wiring.

**7. Rebuild** — `turbo build` from the repo root, so the new routes reach the
`App` type that `@internal/backend-client` and the frontend consume.

Skipping a layer is not a shortcut: a route with no service still needs one, even
if the service method only forwards to a single repository call. The indirection
is what keeps business logic out of the HTTP layer as the endpoint grows.

## Request context

The `contextPlugin` (`src/plugins/context.plugin.ts`) uses `@loglayer/elysia` for
request-scoped logging and `.resolve()` to build an `ApiContext` per request. The
plugin uses `.as("global")` so the types propagate to every consumer.

`ApiContext` is the composition root: it constructs the repositories, passes them
into the services via `serviceParams`, then calls `withServices()` on each
service. Routes see only `ctx.log` and `ctx.services`.

For work outside a request (scripts, jobs), `getRequestlessContext()` returns a
singleton context with no request-scoped data attached.

## Build output

`bun run build` uses `tsconfig.build.json` rather than `tsconfig.json`. It differs
in two ways, both deliberate:

- **`declaration: true`.** The emitted `.d.ts` files are what `@internal/backend-client`
  and the frontend consume. Never turn this off — the root `AGENTS.md` section
  "Build order and why it matters" explains what breaks when they are missing.
- **Tests and `test-utils` are excluded**, because the inferred type of `testApi`
  cannot be named portably in a declaration file and the build fails on it.

Test code is still type-checked: `bun run verify-types` uses the unrestricted
`tsconfig.json`.

**`zod` is a dependency that no source file imports.** It looks unused and is not.
Removing it fails the build:

```
TS2883: The inferred type of 'authOptions' cannot be named without a reference to
'$strip' from '.bun/zod@4.4.3/node_modules/zod/v4/core'. This is likely not
portable. A type annotation is necessary.
```

The chain is `src/lib/auth.ts` → `better-auth` → `better-call` (its router, where
endpoint schemas live) → `zod`. Elysia is not involved: it supports zod through
Standard Schema but declares no zod dependency and has none in its own `.d.ts`.
`dist/server.d.ts` — the whole `App` type — emits with zero zod references, while
`dist/lib/auth.d.ts` contains 32. zod is genuinely part of this package's published
type surface.

**Read the error carefully: TypeScript *found* the type and is refusing to *name*
it.** The only specifier it can construct is that `.bun/…` store path, which means
nothing to a consumer of `@internal/backend`. Declaring the dependency is what makes
`zod/v4/core` a bare specifier any consumer can resolve.

Two consequences, both verified rather than assumed:

- **A transitive copy is not enough.** With zod removed from `package.json` but
  still installed under `.bun/`, reachable through `better-auth`, and even linked at
  `apps/backend/node_modules/zod`, the build fails identically. The declaration is
  the only variable.
- **It cannot be a `devDependency`**, for the same reason — a consumer is not
  guaranteed to have one installed, so TypeScript will not name it.

The alternative is annotating `authOptions` and `auth` explicitly, which would let
zod go. It is not worth it: annotating `authOptions` as `BetterAuthOptions` erases
the plugin-specific typing that `auth.$Infer` and the admin client rely on, and
`auth` has no practical hand-written type.

## Authentication

**Better Auth owns authentication**: the `users`, `sessions`, `accounts`, and
`verifications` tables, password hashing, cookie sessions, and every route under
`/api/auth/*`. It is configured in `src/lib/auth.ts` and mounted directly in
`src/server.ts`.

### It sits outside the layering, deliberately

`auth.handler` is mounted on the Elysia app and talks to Postgres through its own
adapter. Do not write repositories for its tables or call them from a service —
go through `auth.api.*`, which keeps hashing, session invalidation, and plugin
hooks consistent.

Reading is different: `users` **is** declared in the `Database` interface so
application queries can join against it (`src/db/types/auth.db-types.ts`). Treat it
as read-only.

### Columns are snake_case on purpose

Better Auth defaults to quoted camelCase columns and a table literally named
`"user"`. `src/lib/auth.ts` maps every model and field to plural snake_case so its
tables match the rest of the schema and translate correctly through the
`CamelCasePlugin`. Without that mapping, `db.selectFrom("users").select("emailVerified")`
would emit `email_verified` and fail.

The built-in Kysely adapter has no global casing switch — only the Drizzle adapter
does — so each multi-word field is listed explicitly. **A plugin's own fields are
mapped through that plugin's `schema` option**, not the top-level `user`/`session`
maps, which only accept core fields. `src/db/__tests__/camel-case.test.ts` guards
the whole arrangement.

### Changing the auth schema

After adding or removing a Better Auth plugin, run:

```bash
bun run auth:schema
```

It reads the schema from the installed `better-auth` and reports any column the
database is missing, then you add a migration for the difference.

**Do not use `@better-auth/cli generate`.** It is published separately from the
library and lags it — 1.4.x against a 1.7.x runtime at the time of writing — so it
emits a schema missing columns the runtime requires. That migrates cleanly and then
fails on the first sign-up with `column "issuer" ... does not exist`.

### Protecting a route

`authPlugin` (`src/plugins/auth.plugin.ts`) adds an `auth: true` route option that
resolves the session and puts `user` and `session` on the handler context:

```typescript
export const listNotesRoute = new Elysia()
  .use(contextPlugin)
  .use(authPlugin)
  .get("/", async ({ ctx, user }) => ctx.services.notes.listNotes({ userId: user.id }), {
    auth: true,
    response: { 200: ListNotesResponseSchema, 401: "ApiErrorResponse" },
  });
```

A route without `auth: true` is public. Declare `401: "ApiErrorResponse"` on any
route that uses it so the failure appears in the OpenAPI document and is narrowed
for Eden clients.

Take the user id from `user`, never from the request body. Ownership checks belong
in the service — see `NotesService.getOwnedNote`, and the "Security Context" rule.

### Tests

`testFramework.generateTestFacets()` signs a real user up through the mounted
handler and returns the session cookie:

```typescript
const { user, headers } = await testFramework.generateTestFacets();
const { status } = await testApi.notes.get({ query: { limit: 25, offset: 0 }, headers });
```

Pass `{ asAdmin: true }` to promote the user. The admin endpoints require an
existing admin, so the first one cannot be made through the API — outside tests,
`bun run db:seed:run` handles that bootstrap.

### Seeding

`src/db/seeds/0001-admin-user.ts` creates the first admin: it signs the user up
through Better Auth, so the password is hashed and the account row is written
exactly as a real sign-up would, then sets the role directly. It is idempotent, and
the credentials come from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

It is also the worked example of **doing work outside a request**:
`getRequestlessContext()` returns the same services a route would get, with a logger
that has no request attached. Use it for scripts, jobs, and seeds.

## Logging

LogLayer, via `@loglayer/elysia`. The plugin builds a **request-scoped** child
logger per request and attaches a `requestId`, so lines from one request can be
grouped no matter which layer emitted them.

| Layer | Logger | Use it for |
|-------|--------|------------|
| Route | `log` from the handler context | What was asked for, at `info` |
| Service | `this.log` from `BaseService` | Outcomes and decisions, usually `debug` |
| Repository | `this.log` exists but stays unused | Nothing. Queries are noise; the service owns the narrative |
| Outside a request | `getLogger()` | Scripts, jobs, the error handler |

**Prefer structured metadata to interpolated strings.** The fields stay queryable
and the message stays constant:

```typescript
log?.withMetadata({ userId }).info("Fetching user");     // good
log?.info(`Fetching user: ${userId}`);                   // avoid
```

`log` is optional on the handler context (`log?.`) because a route composed without
`contextPlugin` would not have it.

The same request id flows from the route into the services it calls, because
`ApiContext` is built from the request logger:

```
INFO  Creating e-mail user  context.requestId=YT6oxbRkigv9 metadata.email=...
DEBUG Created e-mail user   context.requestId=YT6oxbRkigv9 metadata.userId=...
```

Errors are logged for you — `apiErrorBody` and the global handler both log with the
error's `errId`. Do not log an error and then also return or throw it, or it lands
in the log twice.

### Logging during tests

Logging is disabled globally under `IS_TEST`. Turn it on for one test:

```typescript
import { enableLoggingForTest } from "@/test-utils/logging.js";

enableLoggingForTest();               // or generateTestFacets({ withLogging: true })
```

It restores itself when the test ends, so output does not leak into the rest of the
file. It must be called **before** the request: `@loglayer/elysia` derives the child
logger as the request arrives, and a child derived from a disabled parent stays
silent for that request's lifetime. That is why this is a plain function call rather
than a request header — the header-based version could not work.

## Testing

Tests use **Vitest** with **Testcontainers**, which starts a PostgreSQL container
and applies all migrations before the suite runs. Docker must be running.

```bash
bun run test                                   # everything
bun run test src/api/users/__tests__/get-user.route.test.ts
bun run test -t "should return a 404"
```

### Infrastructure

- `src/test-utils/global-setup.ts` — starts Postgres, sets `DB_*`, runs migrations
- `src/test-utils/global-teardown.ts` — stops the container
- `src/test-utils/test-server.ts` — `testApi`, an Eden Treaty client bound to the
  app instance directly, so no network is involved
- `src/test-utils/test-framework/` — fixture generation

### `testApi`

```typescript
import { testApi } from "@/test-utils/test-server.js";

const { data, error, status } = await testApi.users.email.post({ ... }, { headers });
const list = await testApi.users.get({ query: { limit: 25, offset: 0 } });
const one  = await testApi.users({ userId }).get();   // path params are a call
```

Path parameters are expressed by **calling** the segment, not by string
interpolation.

### `testFramework`

```typescript
import { testFramework } from "@/test-utils/test-framework/index.js";

const { user, headers, password } = await testFramework.generateTestFacets();
const adminFacets = await testFramework.generateTestFacets({ asAdmin: true });
const freshHeaders = await testFramework.signIn({ email: user.email, password });
```

`generateTestFacets` signs a real user up through the mounted Better Auth handler
and returns the session cookie as `headers`. Spread it onto a `testApi` call to make
the request authenticated. Pass `{ withLogging: true }` to see server logs, or
`{ asAdmin: true }` for a user the admin endpoints will accept.

Server logging is off by default to keep output readable.

### Asserting errors

```typescript
const { error, status } = await testApi.users({ userId: unknownId }).get();

expect(status).toBe(404);
expect((error?.value as { code?: string })?.code).toBe(BackendErrorCodes.NOT_FOUND_ERROR);
```

Assert on `code`, not on the message — messages are free to change.

### Testing a service directly

Route tests cover the HTTP contract; a business rule is usually clearer tested
against the service. `getRequestlessContext()` gives you the services outside a
request:

```typescript
const { notes } = getRequestlessContext().services;

await expect(notes.getOwnedNote({ userId: otherId, noteId })).resolves.toBeUndefined();
```

`src/services/__tests__/notes.service.test.ts` is the worked example. Prefer it for
rules like ownership, where asserting on a status code would obscure what is being
tested.

### Writing tests

Tests live in `__tests__/` next to the code they test. Cover the happy path, edge
cases (empty results, pagination boundaries), and error conditions. When fixing a
bug, add the failing test first.

Available: `vitest`, `@faker-js/faker`, `@elysiajs/eden`, `testcontainers`.
