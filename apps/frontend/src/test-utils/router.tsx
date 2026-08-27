import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { type RenderResult, render } from "@testing-library/react";
import { routeTree } from "@/routeTree.gen";

function createTestRouter(initialPath: string, queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

/** The router instance `renderRoute` builds, typed against the generated route tree. */
export type TestRouter = ReturnType<typeof createTestRouter>;

export interface RenderRouteResult extends RenderResult {
  queryClient: QueryClient;
  router: TestRouter;
}

/**
 * Renders the real route tree at `initialPath`, wired the same way `main.tsx` wires
 * it — `queryClient` in the router context and a `QueryClientProvider` above.
 *
 * Retries are disabled so a failing query surfaces immediately instead of after
 * TanStack Query's backoff.
 *
 * @param initialPath - Path to render, e.g. `"/users"`.
 * @param options - Pass a `queryClient` to seed or inspect the cache.
 *
 * @example
 * renderRoute("/users");
 * expect(await screen.findByRole("heading", { name: /Users/ })).toBeInTheDocument();
 */
export function renderRoute(initialPath: string, options: { queryClient?: QueryClient } = {}): RenderRouteResult {
  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

  const router = createTestRouter(initialPath, queryClient);

  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { ...result, queryClient, router };
}
