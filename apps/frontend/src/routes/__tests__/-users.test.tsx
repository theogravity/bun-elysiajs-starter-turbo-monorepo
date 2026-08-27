import { queryOptions } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserList } from "@/api/users";
import { USERS_PAGE_SIZE, userKeys, usersListQuery } from "@/api/users";
import { renderRoute } from "@/test-utils/router";

// Mock the API module rather than stubbing `fetch`. The component under test does
// not care how the request is made, and the transport is covered once in
// `src/api/__tests__/users.test.ts`.
vi.mock("@/api/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/users")>()),
  usersListQuery: vi.fn(),
}));

function mockUsers(data: UserList) {
  // Built with the real key factory so the mock keeps the shape the component and
  // the loader expect. A hand-written key would need a cast, which would hide drift.
  vi.mocked(usersListQuery).mockReturnValue(
    queryOptions({
      queryKey: userKeys.list({ limit: USERS_PAGE_SIZE, offset: 0 }),
      queryFn: async () => data,
    }),
  );
}

describe("Users page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the users returned by the API", async () => {
    mockUsers({
      users: [{ id: "11111111-1111-4111-8111-111111111111", givenName: "Ada", familyName: "Lovelace" }],
      total: 1,
    });

    renderRoute("/users");

    expect(await screen.findByRole("heading", { name: /Users \(1\)/ })).toBeInTheDocument();
    expect(await screen.findByText("11111111-1111-4111-8111-111111111111")).toBeInTheDocument();
  });

  it("shows an empty state when there are no users", async () => {
    mockUsers({ users: [], total: 0 });

    renderRoute("/users");

    expect(await screen.findByText(/No users yet/)).toBeInTheDocument();
  });
});
