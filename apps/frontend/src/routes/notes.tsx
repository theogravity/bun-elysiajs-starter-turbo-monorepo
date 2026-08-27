import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { createNote, noteKeys, notesListQuery } from "@/api/notes";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/notes")({
  /**
   * Guards the route before it renders. `getSession` is asked for directly rather
   * than through `useSession`, because a loader runs outside React.
   *
   * This is a convenience, not the security boundary — the backend rejects an
   * unauthenticated request with 401 regardless of what the client does.
   */
  beforeLoad: async () => {
    const { data } = await authClient.getSession();

    if (!data) {
      throw redirect({ to: "/signin" });
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(notesListQuery()),
  component: NotesPage,
});

function NotesPage() {
  const queryClient = useQueryClient();
  const { data, isPending, error } = useQuery(notesListQuery());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const create = useMutation({
    mutationFn: createNote,
    onSuccess: async () => {
      setTitle("");
      setBody("");
      await queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });

  if (isPending) {
    return <p className="p-8">Loading notes…</p>;
  }

  if (error) {
    return <p className="p-8 text-red-600">{error.message}</p>;
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 font-bold text-2xl">Notes ({data.total})</h1>

      <form
        className="mb-8 flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({ title, body });
        }}
      >
        <input
          aria-label="Title"
          placeholder="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
        <textarea
          aria-label="Body"
          placeholder="Write something…"
          required
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={create.isPending}
          className="self-start rounded bg-gray-900 px-3 py-2 font-medium text-white disabled:opacity-50"
        >
          {create.isPending ? "Saving…" : "Add note"}
        </button>
        {create.error && (
          <p role="alert" className="text-red-600 text-sm">
            {create.error.message}
          </p>
        )}
      </form>

      {data.notes.length === 0 ? (
        <p className="text-gray-600">No notes yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {data.notes.map((note) => (
            <li key={note.id} className="py-3">
              <p className="font-medium">{note.title}</p>
              <p className="text-gray-600 text-sm">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
