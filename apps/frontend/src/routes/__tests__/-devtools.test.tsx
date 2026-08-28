import { beforeEach, describe, expect, it, mock } from "bun:test";
import { screen } from "@testing-library/react";
import { authClient, useSession } from "@/lib/auth-client";
import { asMock } from "@/test-utils/mock";
import { renderRoute } from "@/test-utils/router";

mock.module("@/lib/auth-client", () => ({
  authClient: { getSession: mock() },
  useSession: mock(),
  signIn: { email: mock() },
  signUp: { email: mock() },
  signOut: mock(),
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
    mock.clearAllMocks();
    asMock(authClient.getSession).mockResolvedValue({ data: null } as never);
    asMock(useSession).mockReturnValue({ data: null, isPending: false } as never);
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
