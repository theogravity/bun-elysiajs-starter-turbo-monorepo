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
      <TanStackRouterDevtools />
      <ReactQueryDevtools />
    </>
  );
}
