import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="font-bold text-4xl">Hello, World!</h1>
    </main>
  );
}
