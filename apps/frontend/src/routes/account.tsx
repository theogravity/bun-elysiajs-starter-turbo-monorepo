import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { authClient, signOut, useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/account")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();

    if (!data) {
      throw redirect({ to: "/signin" });
    }
  },
  component: AccountPage,
});

function AccountPage() {
  const { data, isPending } = useSession();
  const navigate = useNavigate();

  if (isPending) {
    return <p className="p-8">Loading…</p>;
  }

  if (!data) {
    return null;
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="mb-4 font-bold text-2xl">Account</h1>

      <dl className="mb-6 grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
        <dt className="text-gray-600">Name</dt>
        <dd>{data.user.name}</dd>
        <dt className="text-gray-600">Email</dt>
        <dd>{data.user.email}</dd>
        <dt className="text-gray-600">Verified</dt>
        <dd>{data.user.emailVerified ? "Yes" : "No"}</dd>
        <dt className="text-gray-600">Role</dt>
        <dd>{(data.user as { role?: string }).role ?? "user"}</dd>
      </dl>

      <button
        type="button"
        className="rounded border border-gray-300 px-3 py-2 font-medium"
        onClick={async () => {
          await signOut();
          await navigate({ to: "/signin" });
        }}
      >
        Sign out
      </button>
    </main>
  );
}
