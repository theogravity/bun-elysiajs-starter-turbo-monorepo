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
});

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
