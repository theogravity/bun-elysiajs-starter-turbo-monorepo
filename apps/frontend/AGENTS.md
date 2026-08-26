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
├── lib/
│   ├── api.ts           # Eden Treaty client singleton + unwrap() helper
│   ├── query-client.ts  # QueryClient singleton
│   └── logger.ts        # LogLayer browser logger
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

### Making a request

Eden resolves to `{ data, error, status }` instead of throwing, which TanStack
Query cannot detect on its own. `unwrap()` in `src/lib/api.ts` converts a failed
response into a rejected promise:

```typescript
import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";

const { data, isPending, error } = useQuery({
  queryKey: ["users", { limit, offset }],
  queryFn: () => unwrap(api.users.get({ query: { limit, offset } })),
});
```

Call shapes mirror the route tree. Path parameters are expressed by **calling** a
segment:

```typescript
api.users.get({ query: { limit: 25, offset: 0 } })   // GET  /users
api.users({ userId }).get()                          // GET  /users/:userId
api.users.email.post({ givenName, familyName, email, password })  // POST /users/email
```

### Handling errors

`unwrap` throws a `BackendRequestError` carrying the backend's error `code`, so
branch on the code rather than the message:

```typescript
import { BackendErrorCodes } from "@internal/backend-errors";
import { BackendRequestError } from "@/lib/api";

if (error instanceof BackendRequestError && error.code === BackendErrorCodes.NOT_FOUND_ERROR) {
  // ...
}
```

Every backend failure has the same body shape: `errId`, `code`, `message`,
`statusCode`, and optional client-safe `metadata`.

### Mutations

```typescript
const mutation = useMutation({
  mutationFn: (input: CreateUserInput) => unwrap(api.users.email.post(input)),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
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

Mock the network by stubbing the global `fetch` — the Eden client issues ordinary
`fetch` calls, so no backend needs to be running:

```typescript
vi.stubGlobal("fetch", vi.fn(async () =>
  new Response(JSON.stringify({ users: [], total: 0 }), {
    status: 200,
    headers: { "content-type": "application/json" },
  })));
```

Call `vi.unstubAllGlobals()` in `afterEach`.

## Constraints

- Never edit `routeTree.gen.ts`; it is generated and Biome-ignored
- Keep route files thin. Past ~200 lines, extract data fetching into
  `src/hooks/`, reusable UI into `src/components/`, and shared types or query
  options into `src/lib/`
- Use Bun, never npm/yarn/pnpm
- Run `bun run verify-types && bun run lint && bun run test` after any change
