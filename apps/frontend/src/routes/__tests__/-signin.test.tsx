import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authClient, signIn, useSession } from "@/lib/auth-client";
import { renderRoute } from "@/test-utils/router";

vi.mock("@/lib/auth-client", () => ({
  authClient: { getSession: vi.fn() },
  useSession: vi.fn(),
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
}));

describe("Sign-in form", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authClient.getSession).mockResolvedValue({ data: null } as never);
    vi.mocked(useSession).mockReturnValue({ data: null, isPending: false } as never);
  });

  it("blocks submission and shows a field error for an invalid email", async () => {
    const user = userEvent.setup();
    renderRoute("/signin");

    await user.type(await screen.findByLabelText("Email"), "not-an-email");
    await user.type(screen.getByLabelText("Password"), "hunter2222");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    // The client schema stopped it before any request was made.
    expect(signIn.email).not.toHaveBeenCalled();
  });

  it("submits valid input and surfaces a server rejection", async () => {
    const user = userEvent.setup();
    vi.mocked(signIn.email).mockResolvedValue({ error: { message: "Invalid email or password" } } as never);

    renderRoute("/signin");

    await user.type(await screen.findByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "hunter2222");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(signIn.email).toHaveBeenCalledWith({
        email: "ada@example.com",
        password: "hunter2222",
      }),
    );
    expect(await screen.findByText("Invalid email or password")).toBeInTheDocument();
  });
});
