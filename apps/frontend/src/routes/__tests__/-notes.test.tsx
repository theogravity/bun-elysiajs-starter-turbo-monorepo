import { beforeEach, describe, expect, it, mock } from "bun:test";
import { queryOptions } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import type { NoteList } from "@/api/notes";
import * as notesApi from "@/api/notes";
import { NOTES_PAGE_SIZE, noteKeys, notesListQuery } from "@/api/notes";
import { authClient, useSession } from "@/lib/auth-client";
import { asMock } from "@/test-utils/mock";
import { renderRoute } from "@/test-utils/router";

// bun:test has no `importOriginal` callback, so the real module is imported as a
// namespace and spread. `mock.module` is not hoisted the way `vi.mock` was, which
// is what makes reading the original here safe rather than circular.
mock.module("@/api/notes", () => ({ ...notesApi, notesListQuery: mock() }));

// The route guard and the nav both ask Better Auth who is signed in.
mock.module("@/lib/auth-client", () => ({
  authClient: { getSession: mock() },
  useSession: mock(),
  signIn: { email: mock() },
  signUp: { email: mock() },
  signOut: mock(),
}));

const signedInUser = { id: "u1", name: "Ada", email: "ada@example.com", emailVerified: true, role: "user" };

function mockSignedIn(user: Record<string, unknown> | null = signedInUser) {
  asMock(authClient.getSession).mockResolvedValue({ data: user ? { user } : null } as never);
  asMock(useSession).mockReturnValue({ data: user ? { user } : null, isPending: false } as never);
}

function mockNotes(data: NoteList) {
  asMock(notesListQuery).mockReturnValue(
    queryOptions({
      queryKey: noteKeys.list({ limit: NOTES_PAGE_SIZE, offset: 0 }),
      queryFn: async () => data,
    }),
  );
}

describe("Notes page", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("renders the signed-in user's notes", async () => {
    mockSignedIn();
    mockNotes({
      notes: [{ id: "n1", title: "Groceries", body: "Milk", createdAt: "2026-01-01T00:00:00.000Z" }],
      total: 1,
    });

    renderRoute("/notes");

    expect(await screen.findByRole("heading", { name: /Notes \(1\)/ })).toBeInTheDocument();
    expect(await screen.findByText("Groceries")).toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    mockSignedIn();
    mockNotes({ notes: [], total: 0 });

    renderRoute("/notes");

    expect(await screen.findByText(/No notes yet/)).toBeInTheDocument();
  });

  it("redirects a signed-out visitor to sign in", async () => {
    mockSignedIn(null);
    mockNotes({ notes: [], total: 0 });

    renderRoute("/notes");

    expect(await screen.findByRole("heading", { name: /Sign in/ })).toBeInTheDocument();
  });
});
