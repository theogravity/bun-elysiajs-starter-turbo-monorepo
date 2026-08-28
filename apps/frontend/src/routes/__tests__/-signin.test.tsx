import { beforeEach, describe, expect, it, mock } from "bun:test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { authClient, signIn, useSession } from "@/lib/auth-client";
import { asMock } from "@/test-utils/mock";
import { renderRoute } from "@/test-utils/router";

mock.module("@/lib/auth-client", () => ({
  authClient: { getSession: mock() },
  useSession: mock(),
  signIn: { email: mock() },
  signUp: { email: mock() },
  signOut: mock(),
}));

describe("Sign-in form", () => {
  beforeEach(() => {
    mock.clearAllMocks();
    asMock(authClient.getSession).mockResolvedValue({ data: null } as never);
    asMock(useSession).mockReturnValue({ data: null, isPending: false } as never);
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
    asMock(signIn.email).mockResolvedValue({ error: { message: "Invalid email or password" } } as never);

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
