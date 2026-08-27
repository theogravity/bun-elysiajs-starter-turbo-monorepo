import { queryOptions } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NoteList } from "@/api/notes";
import { NOTES_PAGE_SIZE, noteKeys, notesListQuery } from "@/api/notes";
import { authClient, useSession } from "@/lib/auth-client";
import { renderRoute } from "@/test-utils/router";

vi.mock("@/api/notes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/notes")>()),
  notesListQuery: vi.fn(),
}));

// The route guard and the nav both ask Better Auth who is signed in.
vi.mock("@/lib/auth-client", () => ({
  authClient: { getSession: vi.fn() },
  useSession: vi.fn(),
  signIn: { email: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
}));

const signedInUser = { id: "u1", name: "Ada", email: "ada@example.com", emailVerified: true, role: "user" };

function mockSignedIn(user: Record<string, unknown> | null = signedInUser) {
  vi.mocked(authClient.getSession).mockResolvedValue({ data: user ? { user } : null } as never);
  vi.mocked(useSession).mockReturnValue({ data: user ? { user } : null, isPending: false } as never);
}

function mockNotes(data: NoteList) {
  vi.mocked(notesListQuery).mockReturnValue(
    queryOptions({
      queryKey: noteKeys.list({ limit: NOTES_PAGE_SIZE, offset: 0 }),
      queryFn: async () => data,
    }),
  );
}

describe("Notes page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
