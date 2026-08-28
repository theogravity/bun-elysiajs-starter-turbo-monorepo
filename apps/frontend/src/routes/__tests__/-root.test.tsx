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

describe("Root route", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    asMock(authClient.getSession).mockResolvedValue({ data: null } as never);
    asMock(useSession).mockReturnValue({ data: null, isPending: false } as never);
  });

  it("renders a not-found page for an unknown URL", async () => {
    renderRoute("/does-not-exist");

    expect(await screen.findByRole("heading", { name: /Page not found/ })).toBeInTheDocument();
  });

  it("shows sign-in and sign-up in the nav when signed out", async () => {
    renderRoute("/");

    expect(await screen.findByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Sign up" })).toBeInTheDocument();
  });
});
