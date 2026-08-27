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

describe("Root route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authClient.getSession).mockResolvedValue({ data: null } as never);
    vi.mocked(useSession).mockReturnValue({ data: null, isPending: false } as never);
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
