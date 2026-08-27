import { BackendErrorCodes } from "@internal/backend-errors";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { usersListQuery } from "@/api/users";
import { BackendRequestError } from "@/lib/api";

export const Route = createFileRoute("/users")({
  // `context.queryClient` comes from the router context created in main.tsx.
  // Prefetching in the loader means the component renders with data already warm.
  // The loader and the component below share one query definition, so their key
  // and fetcher cannot drift apart.
  loader: ({ context }) => context.queryClient.ensureQueryData(usersListQuery()),
  component: UsersPage,
});

function UsersPage() {
  const { data, isPending, error } = useQuery(usersListQuery());

  if (isPending) {
    return <p className="p-8">Loading users…</p>;
  }

  if (error) {
    // `unwrap` turns a failed Eden response into a BackendRequestError, so the
    // backend's error `code` is available to branch on.
    const message =
      error instanceof BackendRequestError && error.code === BackendErrorCodes.NOT_FOUND_ERROR
        ? "No users found."
        : error.message;

    return <p className="p-8 text-red-600">{message}</p>;
  }

  return (
    <main className="p-8">
      <h1 className="mb-4 font-bold text-2xl">Users ({data.total})</h1>

      {data.users.length === 0 ? (
        <p className="text-gray-600">
          No users yet. Create one with <code>POST /users/email</code>.
        </p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {data.users.map((user) => (
            <li key={user.id} className="py-2">
              <span className="font-medium">
                {user.givenName} {user.familyName}
              </span>
              <span className="ml-2 text-gray-500 text-sm">{user.id}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
