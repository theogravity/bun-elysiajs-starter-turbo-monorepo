import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authClient, useSession } from "@/lib/auth-client";
import { renderRoute } from "@/test-utils/router";

vi.mock("@/lib/auth-client", () => ({
  authClient: { getSession: vi.fn() },
  useSession: vi.fn(),
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
}));

/**
 * Guards the devtools condition in `__root.tsx`.
 *
 * With devtools mounted, their `aria-label`s pollute the accessibility tree and
 * `getByLabel("Password")` starts matching unrelated buttons — which is how this
 * first surfaced, as six failing end-to-end tests.
 */
describe("Router devtools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authClient.getSession).mockResolvedValue({ data: null } as never);
    vi.mocked(useSession).mockReturnValue({ data: null, isPending: false } as never);
  });

  it("does not mount devtools during tests", async () => {
    renderRoute("/");

    await screen.findByRole("link", { name: "Sign in" });

    expect(screen.queryAllByLabelText(/Open match details/i)).toHaveLength(0);
    expect(screen.queryByText(/TanStack/i)).toBeNull();
  });

  it("leaves label queries unambiguous", async () => {
    renderRoute("/signin");

    // The devtools add labels containing "password" for the /forgot-password and
    // /reset-password routes. Exactly one real field must match.
    expect(await screen.findByLabelText("Password", { exact: true })).toBeInTheDocument();
    expect(screen.queryAllByLabelText(/password/i)).toHaveLength(1);
  });
});
