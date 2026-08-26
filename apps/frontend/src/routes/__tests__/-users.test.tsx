import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";

/**
 * The Eden client issues ordinary `fetch` calls, so stubbing the global is enough
 * to drive the page without a running backend.
 */
function mockResponse(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "content-type": "application/json" },
        }),
    ),
  );
}

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [path] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { queryClient, router };
}

describe("Users page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the users returned by the API", async () => {
    mockResponse({
      users: [{ id: "11111111-1111-4111-8111-111111111111", givenName: "Ada", familyName: "Lovelace" }],
      total: 1,
    });

    renderAt("/users");

    expect(await screen.findByRole("heading", { name: /Users \(1\)/ })).toBeInTheDocument();
    expect(await screen.findByText("11111111-1111-4111-8111-111111111111")).toBeInTheDocument();
  });

  it("shows an empty state when there are no users", async () => {
    mockResponse({ users: [], total: 0 });

    renderAt("/users");

    expect(await screen.findByText(/No users yet/)).toBeInTheDocument();
  });
});
