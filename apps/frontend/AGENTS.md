# Frontend AGENTS.md

React 19 + Vite + TanStack Router + TanStack Query + Tailwind CSS v4.

See the root `AGENTS.md` for monorepo-wide commands and `apps/backend/AGENTS.md`
for the API this talks to.

> **The `notes` pages are example scaffolding.** `index.tsx`, `notes.tsx`, its test,
> and the related nav links demonstrate the wiring — they are not the app. Replace
> them with real screens. The auth screens (`signin`, `signup`, `account`,
> `admin/users`) and `src/lib/auth-client.ts` are infrastructure worth keeping. The plumbing they rely on
> (`src/lib/api.ts`, the router context in `main.tsx`, `test-setup.ts`) is
> infrastructure worth keeping. See
> [Example scaffolding vs. project infrastructure](../../AGENTS.md).

## Commands

```bash
bun run dev             # Vite dev server on http://localhost:5173
bun run build           # Production build (also regenerates routeTree.gen.ts)
bun run test            # Vitest + React Testing Library (happy-dom)
bun run lint            # Biome check + autofix
bun run verify-types    # tsc --noEmit
```

The backend must be running separately (`cd apps/backend && bun run dev`) for API
calls to succeed.

## What exists

```
src/
├── api/
│   ├── notes.ts         # every /notes call, its query keys and query options
│   └── __tests__/
│       └── notes.test.ts
├── lib/
│   ├── api.ts           # Eden Treaty client singleton + unwrap() helper
│   ├── auth-client.ts   # Better Auth browser client (+ admin plugin)
│   ├── query-client.ts  # QueryClient singleton
│   └── logger.ts        # LogLayer browser logger
├── test-utils/
│   ├── fetch.ts         # stubFetch() — only for src/api/ tests
│   └── router.tsx       # renderRoute() — renders the real route tree
├── routes/
│   ├── __tests__/
│   │   └── -notes.test.tsx   # Route test. The `-` prefix is required.
│   ├── __root.tsx       # Root layout, session-aware nav, devtools
│   ├── index.tsx        # /
│   ├── signin.tsx       # /signin
│   ├── signup.tsx       # /signup
│   ├── account.tsx      # /account
│   ├── admin/users.tsx  # /admin/users — admin-only user table
│   └── notes.tsx        # /notes     — example protected route
├── routeTree.gen.ts     # Auto-generated. Never edit.
├── main.tsx             # Router + QueryClientProvider composition
├── test-setup.ts        # Registers jest-dom matchers with Vitest
├── vite-env.d.ts        # Types for import.meta.env
└── styles.css           # Tailwind entry
```

There is **no component library installed** — no shadcn/ui, no `cn()` helper, no
`clsx`/`tailwind-merge`. Style with plain Tailwind classes. If you want a
component library, install it first rather than importing from paths that do not
exist.

## Conventions

### Imports take no extension

`tsconfig.json` uses `moduleResolution: bundler`, so imports are extensionless.
This is the opposite of the backend, which requires `.js`.

```typescript
import { api } from "@/lib/api";     // correct
import { api } from "@/lib/api.js";  // wrong here, right in the backend
```

`@/` is aliased to `src/` in `tsconfig.json`, `vite.config.ts`, and
`vitest.config.ts` — all three must agree if you change it.

### Environment

Copy `.env.example` to `.env`. Only `VITE_`-prefixed variables reach the browser.

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:3080` | Backend base URL |

Add new variables to `src/vite-env.d.ts` so `import.meta.env` stays typed.

## Talking to the backend

`@internal/backend-client` is an Eden Treaty client typed directly from the
backend's `App` type. There is no code generation, but **the backend must have
been built** (`turbo build`) for new routes to appear — the types come from
`apps/backend/dist/*.d.ts`.

If the client's methods vanish or you see the type
`"Please install Elysia before using Eden"`, the backend's declarations are
missing or stale. Run `turbo build`.

### The `src/api/` layer

**Components and routes do not call the Eden client directly.** Every endpoint is
defined once in `src/api/{resource}.ts`, and everything else imports from there.
One file per backend resource, mirroring `apps/backend/src/api/{resource}/`.

That module owns three things for its resource:

```typescript
// src/api/notes.ts
export function listNotes(params: ListUsersParams = {}) {   // 1. the call
  return unwrap(api.notes.get({ query: withDefaults(params), fetch: { credentials: "include" } }));
}

export const noteKeys = {                                    // 2. the query keys
  all: ["notes"] as const,
  list: (params) => [...noteKeys.all, "list", params] as const,
  detail: (userId: string) => [...noteKeys.all, "detail", userId] as const,
};

export function notesListQuery(params: ListUsersParams = {}) {  // 3. query options
  const resolved = withDefaults(params);
  return queryOptions({ queryKey: noteKeys.list(resolved), queryFn: () => listNotes(resolved) });
}
```

Why it is worth the indirection:

- **An endpoint change is a one-file change.** A renamed path or a new query
  parameter is edited here, not hunted for across routes and components.
- **The key and the fetcher cannot drift.** They are built from the same
  normalized params in the same function, so `notesListQuery()` and
  `notesListQuery({ offset: 0 })` produce one cache entry rather than two.
- **Keys nest under a common prefix**, so `queryClient.invalidateQueries({ queryKey: noteKeys.all })`
  invalidates every query for the resource without a component knowing how keys
  are shaped.
- **Tests get simpler.** Components mock the module; only the api module itself
  needs a stubbed `fetch`. See [Testing](#testing).

### Using it

```typescript
import { useQuery } from "@tanstack/react-query";
import { notesListQuery } from "@/api/notes";

// In a route loader — prefetch so the component renders warm
loader: ({ context }) => context.queryClient.ensureQueryData(notesListQuery()),

// In the component — same definition, so the same cache entry
const { data, isPending, error } = useQuery(notesListQuery());
```

`src/api/notes.ts` and `src/routes/notes.tsx` are a complete worked example.

### Adding an endpoint

1. Add the call to the matching `src/api/{resource}.ts`, wrapping the Eden call in
   `unwrap()`. Create the file if the resource is new.
2. Add a key to that resource's `*Keys` object, and a `queryOptions` factory if it
   is a query.
3. Derive response types from the function — `Awaited<ReturnType<typeof listNotes>>`
   — rather than restating the shape. It then tracks the backend automatically.
4. Cover the request in `src/api/__tests__/{resource}.test.ts`: assert the method,
   the path, and the parameters.

Call shapes on the underlying client mirror the route tree, and path parameters are
expressed by **calling** a segment:

```typescript
api.notes.get({ query: { limit: 25, offset: 0 } })   // GET  /notes
api.notes({ noteId }).get()                          // GET  /notes/:noteId
api.notes.post({ title, body })                      // POST /notes
```

### Mutations

The mutation function comes from the api module too, and invalidation uses the key
factory rather than a literal:

```typescript
import { createNote, noteKeys } from "@/api/notes";

const mutation = useMutation({
  mutationFn: createNote,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
});
```

## Logging

LogLayer, configured in `src/lib/logger.ts`. Use structured metadata rather than
interpolated strings, so fields stay queryable:

```typescript
import { getLogger } from "@/lib/logger";

getLogger().withMetadata({ userId }).info("Opened user detail");
```

Two things already log, and you should not duplicate them:

- **`unwrap()` logs every failed backend call** with the response `status`, the
  backend error `code`, and its `errId`. That id is the backend's identifier for the
  same failure, so quoting it in a bug report is what lets someone find the matching
  server-side line. Components do not need to log a caught query error again.
- **`main.tsx` logs the API base URL at startup**, which is the first thing worth
  knowing when the app is pointed at the wrong environment.

Logging is disabled when `import.meta.env.MODE === "test"`, mirroring the backend,
so test output stays readable. Call `logger.enableLogging()` inside a test that needs
to see it.

## Authentication

`src/lib/auth-client.ts` is the Better Auth browser client. Sessions are cookies, so
it is configured with `credentials: "include"` and the backend allows exactly this
origin — cookie auth cannot use a wildcard CORS origin.

```typescript
import { signIn, signUp, signOut, useSession, authClient } from "@/lib/auth-client";

const { data, isPending } = useSession();   // data is null when signed out
```

Better Auth returns `{ data, error }` rather than throwing, the same shape as Eden:

```typescript
const { error } = await signIn.email({ email, password });
if (error) throw new Error(error.message ?? "Could not sign in");
```

### Guarding a route

Use `beforeLoad`, which runs outside React, so ask the client directly rather than
using the `useSession` hook:

```typescript
export const Route = createFileRoute("/notes")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) throw redirect({ to: "/signin" });
  },
});
```

**This is convenience, not security.** The backend returns 401 regardless of what
the client does. `admin/users.tsx` shows the same pattern with a role check.

### Admin

`adminClient()` mirrors the server plugin and adds `authClient.admin.*` —
`listUsers`, `setRole`, `banUser`, `unbanUser`, `impersonateUser`. `/admin/users`
uses them with TanStack Query. Every call is authorized again on the server.

### Prebuilt screens

The auth screens here are plain Tailwind, matching the rest of the template. Better
Auth also publishes prebuilt screens through its shadcn registry
(`bunx shadcn@latest add @better-auth-ui/auth`) — adopt those if you want shadcn/ui;
its `@better-auth-ui/react` package supplies the hooks behind them.

## Routing

Routes are file-based; `@tanstack/router-plugin` regenerates `routeTree.gen.ts` on
dev and build. **A new route file will not typecheck until the tree is
regenerated** — run `bun run dev` or `bun run build` after adding one.

| File | URL |
|------|-----|
| `src/routes/index.tsx` | `/` |
| `src/routes/notes.tsx` | `/notes` |
| `src/routes/admin/users.tsx` | `/admin/users` |

### Router context

`main.tsx` creates the router with `{ queryClient }` as context, and `__root.tsx`
declares that shape via `createRootRouteWithContext<RouterContext>()`. That is what
makes `context.queryClient` available in loaders:

```typescript
export const Route = createFileRoute("/notes")({
  loader: ({ context }) => context.queryClient.ensureQueryData(notesListQuery()),
  component: UsersPage,
});
```

Prefetching in the loader is optional but means the component renders with data
already warm. Define the query options in one function shared by the loader and
the component so the key and fetcher cannot drift apart — `src/routes/notes.tsx`
shows the pattern.

### Navigation

```typescript
import { Link, useNavigate } from "@tanstack/react-router";

<Link to="/notes">Notes</Link>
<Link to="/admin/users">Users</Link>

const navigate = useNavigate();
navigate({ to: "/notes" });
```

`to` is typed against the generated route tree, so an unknown path is a type
error.

## Testing

Vitest with happy-dom and React Testing Library.

`src/test-setup.ts` imports `@testing-library/jest-dom/vitest`, **not** the bare
`@testing-library/jest-dom`. The bare entrypoint assumes a global `expect`, which
only exists when `globals: true` is set in the Vitest config — it is not set here,
and using it makes every test file fail to load with `expect is not defined`. The
`/vitest` entrypoint registers the matchers against Vitest's own `expect`.

Component tests live alongside the component as `Component.test.tsx`. Route tests
go in `src/routes/__tests__/` and **must be prefixed with `-`**
(`-notes.test.tsx`) so the router plugin does not treat them as routes. A
`-`-prefixed file is still collected and run by Vitest; it is only excluded from
`routeTree.gen.ts`.

`src/routes/__tests__/-notes.test.tsx` is a working example of the whole pattern.

```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { routeTree } from "@/routeTree.gen";

function createTestRouter(initialPath = "/") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  return { router, queryClient };
}
```

### Two layers, two ways to fake the network

Test the transport once, in the api module. Everything above it mocks that module.
`src/test-utils/` holds the shared helpers so no test writes this plumbing itself.

**`src/api/__tests__/{resource}.test.ts` — `stubFetch` from `@/test-utils/fetch`.**
This is the only place that should replace `fetch`. Assert the method, path, and
parameters, so a changed endpoint fails here rather than obscurely in a component
test:

```typescript
import { stubFetch } from "@/test-utils/fetch";

const captured = stubFetch({ notes: [], total: 0 });

await listNotes();

expect(captured[0]?.method).toBe("GET");
expect(captured[0]?.url.pathname).toBe("/notes");
expect(captured[0]?.url.searchParams.get("limit")).toBe("25");
```

`stubFetch` returns a live array of captured requests. Each has `method`, a parsed
`url`, `headers`, and `json()` for asserting a POST body. Pass a status for an
error reply — `stubFetch(body, { status: 404 })` — or a function to vary the reply
per request.

No cleanup is needed: `unstubGlobals` is set in `vitest.config.ts`, so a stub is
removed before the next test and cannot leak.

**Component and route tests — `renderRoute` from `@/test-utils/router`, and mock
`@/api/{resource}`.** No `Response` objects, no URLs, no coupling to how the
request is made:

```typescript
import { renderRoute } from "@/test-utils/router";

vi.mock("@/api/notes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/notes")>()),
  notesListQuery: vi.fn(),
}));

vi.mocked(notesListQuery).mockReturnValue(
  queryOptions({
    queryKey: noteKeys.list({ limit: NOTES_PAGE_SIZE, offset: 0 }),
    queryFn: async () => ({ notes: [], total: 0 }),
  }),
);

renderRoute("/notes");
```

`renderRoute` builds the real route tree with the same wiring as `main.tsx` —
`queryClient` in the router context, a `QueryClientProvider` above — with retries
disabled so a failing query surfaces immediately. It returns everything
`render()` does plus `queryClient` and `router`, and accepts a `queryClient` if a
test needs to seed or inspect the cache.

Build the mocked key with the real key factory. A hand-written key needs a cast to
typecheck, and the cast is exactly what would hide a drifted key.

Note that partially mocking a module only replaces its **exports**. `notesListQuery`
calls `listNotes` through a module-local binding, so mocking `listNotes` alone would
not affect it — mock the function the component actually imports.

## Constraints

- Never edit `routeTree.gen.ts`; it is generated and Biome-ignored
- Never call the Eden client from a route or component; go through `src/api/`
- Keep route files thin. Past ~200 lines, extract data fetching into
  `src/hooks/`, reusable UI into `src/components/`, and shared types or query
  options into `src/lib/`
- Use Bun, never npm/yarn/pnpm
- Run `bun run verify-types && bun run lint && bun run test` after any change
