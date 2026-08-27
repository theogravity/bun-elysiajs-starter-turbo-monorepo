# Frontend AGENTS.md

React 19 + Vite + TanStack Router + TanStack Query + Tailwind CSS v4.

See the root `AGENTS.md` for monorepo-wide commands and `apps/backend/AGENTS.md`
for the API this talks to.

> **The pages here are example scaffolding.** `index.tsx` ("Hello, World!"),
> `users.tsx`, its test, and the nav links in `__root.tsx` demonstrate the wiring —
> they are not the app. Replace them with real screens. The plumbing they rely on
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
│   ├── users.ts         # every /users call, its query keys and query options
│   └── __tests__/
│       └── users.test.ts
├── lib/
│   ├── api.ts           # Eden Treaty client singleton + unwrap() helper
│   ├── query-client.ts  # QueryClient singleton
│   └── logger.ts        # LogLayer browser logger
├── test-utils/
│   ├── fetch.ts         # stubFetch() — only for src/api/ tests
│   └── router.tsx       # renderRoute() — renders the real route tree
├── routes/
│   ├── __tests__/
│   │   └── -users.test.tsx   # Route test. The `-` prefix is required.
│   ├── __root.tsx       # Root layout, nav, devtools
│   ├── index.tsx        # /          — example page
│   └── users.tsx        # /users     — example data-fetching route
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
// src/api/users.ts
export function listUsers(params: ListUsersParams = {}) {   // 1. the call
  return unwrap(api.users.get({ query: withDefaults(params) }));
}

export const userKeys = {                                    // 2. the query keys
  all: ["users"] as const,
  list: (params) => [...userKeys.all, "list", params] as const,
  detail: (userId: string) => [...userKeys.all, "detail", userId] as const,
};

export function usersListQuery(params: ListUsersParams = {}) {  // 3. query options
  const resolved = withDefaults(params);
  return queryOptions({ queryKey: userKeys.list(resolved), queryFn: () => listUsers(resolved) });
}
```

Why it is worth the indirection:

- **An endpoint change is a one-file change.** A renamed path or a new query
  parameter is edited here, not hunted for across routes and components.
- **The key and the fetcher cannot drift.** They are built from the same
  normalized params in the same function, so `usersListQuery()` and
  `usersListQuery({ offset: 0 })` produce one cache entry rather than two.
- **Keys nest under a common prefix**, so `queryClient.invalidateQueries({ queryKey: userKeys.all })`
  invalidates every query for the resource without a component knowing how keys
  are shaped.
- **Tests get simpler.** Components mock the module; only the api module itself
  needs a stubbed `fetch`. See [Testing](#testing).

### Using it

```typescript
import { useQuery } from "@tanstack/react-query";
import { usersListQuery } from "@/api/users";

// In a route loader — prefetch so the component renders warm
loader: ({ context }) => context.queryClient.ensureQueryData(usersListQuery()),

// In the component — same definition, so the same cache entry
const { data, isPending, error } = useQuery(usersListQuery());
```

`src/api/users.ts` and `src/routes/users.tsx` are a complete worked example.

### Adding an endpoint

1. Add the call to the matching `src/api/{resource}.ts`, wrapping the Eden call in
   `unwrap()`. Create the file if the resource is new.
2. Add a key to that resource's `*Keys` object, and a `queryOptions` factory if it
   is a query.
3. Derive response types from the function — `Awaited<ReturnType<typeof listUsers>>`
   — rather than restating the shape. It then tracks the backend automatically.
4. Cover the request in `src/api/__tests__/{resource}.test.ts`: assert the method,
   the path, and the parameters.

Call shapes on the underlying client mirror the route tree, and path parameters are
expressed by **calling** a segment:

```typescript
api.users.get({ query: { limit: 25, offset: 0 } })   // GET  /users
api.users({ userId }).get()                          // GET  /users/:userId
api.users.email.post({ givenName, familyName, email, password })  // POST /users/email
```

### Mutations

The mutation function comes from the api module too, and invalidation uses the key
factory rather than a literal:

```typescript
import { createEMailUser, userKeys } from "@/api/users";

const mutation = useMutation({
  mutationFn: createEMailUser,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
});
```

## Routing

Routes are file-based; `@tanstack/router-plugin` regenerates `routeTree.gen.ts` on
dev and build. **A new route file will not typecheck until the tree is
regenerated** — run `bun run dev` or `bun run build` after adding one.

| File | URL |
|------|-----|
| `src/routes/index.tsx` | `/` |
| `src/routes/users.tsx` | `/users` |
| `src/routes/users/$userId.tsx` | `/users/:userId` |

### Router context

`main.tsx` creates the router with `{ queryClient }` as context, and `__root.tsx`
declares that shape via `createRootRouteWithContext<RouterContext>()`. That is what
makes `context.queryClient` available in loaders:

```typescript
export const Route = createFileRoute("/users")({
  loader: ({ context }) => context.queryClient.ensureQueryData(usersQuery(0)),
  component: UsersPage,
});
```

Prefetching in the loader is optional but means the component renders with data
already warm. Define the query options in one function shared by the loader and
the component so the key and fetcher cannot drift apart — `src/routes/users.tsx`
shows the pattern.

### Navigation

```typescript
import { Link, useNavigate } from "@tanstack/react-router";

<Link to="/users">Users</Link>
<Link to="/users/$userId" params={{ userId }}>Detail</Link>

const navigate = useNavigate();
navigate({ to: "/users" });
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
(`-users.test.tsx`) so the router plugin does not treat them as routes. A
`-`-prefixed file is still collected and run by Vitest; it is only excluded from
`routeTree.gen.ts`.

`src/routes/__tests__/-users.test.tsx` is a working example of the whole pattern.

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

const captured = stubFetch({ users: [], total: 0 });

await listUsers();

expect(captured[0]?.method).toBe("GET");
expect(captured[0]?.url.pathname).toBe("/users");
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

vi.mock("@/api/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/users")>()),
  usersListQuery: vi.fn(),
}));

vi.mocked(usersListQuery).mockReturnValue(
  queryOptions({
    queryKey: userKeys.list({ limit: USERS_PAGE_SIZE, offset: 0 }),
    queryFn: async () => ({ users: [], total: 0 }),
  }),
);

renderRoute("/users");
```

`renderRoute` builds the real route tree with the same wiring as `main.tsx` —
`queryClient` in the router context, a `QueryClientProvider` above — with retries
disabled so a failing query surfaces immediately. It returns everything
`render()` does plus `queryClient` and `router`, and accepts a `queryClient` if a
test needs to seed or inspect the cache.

Build the mocked key with the real key factory. A hand-written key needs a cast to
typecheck, and the cast is exactly what would hide a drifted key.

Note that partially mocking a module only replaces its **exports**. `usersListQuery`
calls `listUsers` through a module-local binding, so mocking `listUsers` alone would
not affect it — mock the function the component actually imports.

## Constraints

- Never edit `routeTree.gen.ts`; it is generated and Biome-ignored
- Never call the Eden client from a route or component; go through `src/api/`
- Keep route files thin. Past ~200 lines, extract data fetching into
  `src/hooks/`, reusable UI into `src/components/`, and shared types or query
  options into `src/lib/`
- Use Bun, never npm/yarn/pnpm
- Run `bun run verify-types && bun run lint && bun run test` after any change
