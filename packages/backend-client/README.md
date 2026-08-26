# @internal/backend-client

Type-safe client for the backend API, built on
[Eden Treaty](https://elysiajs.com/eden/overview).

```typescript
import { createBackendClient } from "@internal/backend-client";

const api = createBackendClient("http://localhost:3080");

const { data, error, status } = await api.users.get({ query: { limit: 25, offset: 0 } });
```

## How it works

There is **no code generation**. The package is a thin wrapper that applies
`treaty<App>` to the backend's exported `App` type, so the client's shape is
derived from the route definitions at type-check time:

```typescript
export type BackendClient = ReturnType<typeof treaty<App>>;
```

Adding a route to the backend makes it appear here as soon as the types are
rebuilt. There is nothing to regenerate and nothing to keep in sync by hand.

## The build dependency that matters

`tsdown` inlines the backend's `App` type into `dist/index.d.ts`, which means
consumers do not need `@internal/backend` themselves. But that inlining only works
if the backend actually emitted declarations.

`apps/backend` builds with `tsconfig.build.json`, which sets `declaration: true`.
Without it, `@internal/backend` resolves to plain JavaScript, `App` silently
becomes `any`, and Eden produces an untyped client — calls to routes that do not
exist still compile. The visible symptom is the type
`"Please install Elysia before using Eden"`.

So: **run `turbo build` after changing backend routes.** The Turbo pipeline orders
`@internal/backend` before this package before the frontend.

## Consuming from an app

The app needs `@elysiajs/eden` and `elysia` resolvable for the types, even though
the runtime `treaty()` call is bundled here. `apps/frontend` declares both as
devDependencies for exactly this reason.

## Response shape

Eden resolves rather than throws:

```typescript
const { data, error, status } = await api.users({ userId }).get();

if (error) {
  switch (error.status) {
    case 404:
      // error.value is the backend's ApiErrorResponse body
      break;
  }
}

// data is narrowed to non-null once error is handled
```

`apps/frontend/src/lib/api.ts` wraps this in an `unwrap()` helper that converts a
failed response into a rejected promise, which is what TanStack Query expects.
