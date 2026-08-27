import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

/** Query key for the admin user list. */
const adminUserKeys = { list: ["admin", "users"] as const };

export const Route = createFileRoute("/admin/users")({
  /**
   * Admin-only. The check is repeated on the server for every `admin.*` call —
   * this only avoids rendering a page the API would refuse.
   */
  beforeLoad: async () => {
    const { data } = await authClient.getSession();

    if (!data) {
      throw redirect({ to: "/signin" });
    }

    if ((data.user as { role?: string }).role !== "admin") {
      throw redirect({ to: "/notes" });
    }
  },
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: adminUserKeys.list,
    queryFn: async () => {
      const { data, error } = await authClient.admin.listUsers({ query: { limit: 100 } });

      if (error) {
        throw new Error(error.message ?? "Could not list users");
      }

      return data;
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "user" }) => {
      const { error } = await authClient.admin.setRole({ userId, role });

      if (error) {
        throw new Error(error.message ?? "Could not change role");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.list }),
  });

  const setBanned = useMutation({
    mutationFn: async ({ userId, banned }: { userId: string; banned: boolean }) => {
      const { error } = banned
        ? await authClient.admin.banUser({ userId })
        : await authClient.admin.unbanUser({ userId });

      if (error) {
        throw new Error(error.message ?? "Could not update the ban");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminUserKeys.list }),
  });

  if (isPending) {
    return <p className="p-8">Loading users…</p>;
  }

  if (error) {
    return <p className="p-8 text-red-600">{error.message}</p>;
  }

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-4 font-bold text-2xl">Users ({data?.users.length ?? 0})</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-gray-200 border-b">
            <tr>
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data?.users.map((user) => {
              const role = (user as { role?: string }).role ?? "user";
              const banned = Boolean((user as { banned?: boolean }).banned);

              return (
                <tr key={user.id}>
                  <td className="py-2">{user.name}</td>
                  <td className="py-2">{user.email}</td>
                  <td className="py-2">{role}</td>
                  <td className="py-2">{banned ? "Banned" : "Active"}</td>
                  <td className="flex gap-2 py-2">
                    <button
                      type="button"
                      className="rounded border border-gray-300 px-2 py-1"
                      onClick={() => setRole.mutate({ userId: user.id, role: role === "admin" ? "user" : "admin" })}
                    >
                      {role === "admin" ? "Demote" : "Promote"}
                    </button>
                    <button
                      type="button"
                      className="rounded border border-gray-300 px-2 py-1"
                      onClick={() => setBanned.mutate({ userId: user.id, banned: !banned })}
                    >
                      {banned ? "Unban" : "Ban"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
