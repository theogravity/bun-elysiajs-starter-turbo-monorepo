import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { useSession } from "@/lib/auth-client";

/** Shape of the router context created in `main.tsx`. */
export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  // Without these, an unknown URL or a thrown render error leaves a blank page.
  notFoundComponent: NotFound,
  errorComponent: ErrorBoundary,
});

function NotFound() {
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-2 font-bold text-2xl">Page not found</h1>
      <p className="mb-4 text-gray-600">That URL does not match any route.</p>
      <Link to="/" className="underline">
        Go home
      </Link>
    </main>
  );
}

function ErrorBoundary({ error }: { error: Error }) {
  // `unwrap` has already logged the underlying failure with its errId, so this only
  // has to render something. Detail is shown because this is a starter; trim it if
  // your app should not surface internals.
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-2 font-bold text-2xl">Something went wrong</h1>
      <p className="mb-4 text-red-600">{error.message}</p>
      <Link to="/" className="underline">
        Go home
      </Link>
    </main>
  );
}

/**
 * Devtools render only in an interactive development session.
 *
 * They inject buttons labelled "Open match details for /forgot-password" and the
 * like. Those land in the accessibility tree, where they collide with ordinary
 * queries — `getByLabel("Password")` matches three elements with them present.
 *
 * Both conditions are deliberate, not redundant:
 *
 * - `MODE !== "test"` covers the unit tests. Bun does not define Vite's `MODE`,
 *   so `src/test-dom.ts` sets it as part of the test preload.
 * - `!navigator.webdriver` covers Playwright and other browser automation, which
 *   runs a production-mode build against a real browser where `MODE` is not
 *   `"test"`.
 *
 * happy-dom currently reports `webdriver` as true, so the second check alone
 * happens to cover unit tests too — but that is an implementation detail, and
 * jsdom reports false. Relying on it would mean devtools silently reappearing in
 * the DOM under assertion if the environment ever changed.
 */
const showDevtools = import.meta.env.DEV && import.meta.env.MODE !== "test" && !navigator.webdriver;

function RootComponent() {
  const { data } = useSession();
  const role = (data?.user as { role?: string } | undefined)?.role;

  return (
    <>
      <nav className="flex items-center gap-4 border-gray-200 border-b p-4">
        <Link to="/" className="font-medium hover:underline">
          Home
        </Link>

        {data ? (
          <>
            <Link to="/notes" className="font-medium hover:underline">
              Notes
            </Link>
            {role === "admin" && (
              <Link to="/admin/users" className="font-medium hover:underline">
                Users
              </Link>
            )}
            <Link to="/account" className="ml-auto font-medium hover:underline">
              {data.user.name}
            </Link>
          </>
        ) : (
          <>
            <Link to="/signin" className="ml-auto font-medium hover:underline">
              Sign in
            </Link>
            <Link to="/signup" className="font-medium hover:underline">
              Sign up
            </Link>
          </>
        )}
      </nav>
      <Outlet />
      {showDevtools && (
        <>
          <TanStackRouterDevtools />
          <ReactQueryDevtools />
        </>
      )}
    </>
  );
}
