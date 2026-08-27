import { createFileRoute, Link } from "@tanstack/react-router";
import { useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { data, isPending } = useSession();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-2 font-bold text-3xl">Bun + ElysiaJS starter</h1>
      <p className="mb-6 text-gray-600">
        Authentication is handled by Better Auth. Notes are an example resource owned by this app.
      </p>

      {isPending ? null : data ? (
        <Link to="/notes" className="underline">
          Go to your notes
        </Link>
      ) : (
        <Link to="/signin" className="underline">
          Sign in to continue
        </Link>
      )}
    </main>
  );
}
