import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { createNote, noteKeys, notesListQuery } from "@/api/notes";
import { FormError } from "@/components/AuthLayout";
import { FormField } from "@/components/FormField";
import { authClient } from "@/lib/auth-client";
import { applyServerErrors } from "@/lib/form";
import { type CreateNoteValues, createNoteSchema } from "@/lib/note-schemas";

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
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateNoteValues>({ resolver: zodResolver(createNoteSchema) });

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
        noValidate
        className="mb-8 flex flex-col gap-3"
        onSubmit={handleSubmit(async (values) => {
          try {
            await createNote(values);
            reset();
            await queryClient.invalidateQueries({ queryKey: noteKeys.all });
          } catch (cause) {
            // The zod schema above mirrors the route's `t` schema, but the server
            // is the authority — this puts its per-field messages back on the
            // matching inputs when the two disagree.
            applyServerErrors(setError, cause);
          }
        })}
      >
        <FormField label="Title" error={errors.title} registration={register("title")} />

        <label className="flex flex-col gap-1">
          <span className="font-medium text-sm">Body</span>
          <textarea
            aria-invalid={errors.body ? true : undefined}
            className="rounded border border-gray-300 px-3 py-2 aria-[invalid]:border-red-500"
            {...register("body")}
          />
          {errors.body && (
            <span role="alert" className="text-red-600 text-sm">
              {errors.body.message}
            </span>
          )}
        </label>

        <FormError message={errors.root?.message} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="self-start rounded bg-gray-900 px-3 py-2 font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? "Saving…" : "Add note"}
        </button>
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
