import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";
import { signIn } from "@/lib/auth-client";

export const Route = createFileRoute("/signin")({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Sign in"
      submitLabel="Sign in"
      onSubmit={async ({ email, password }) => {
        const { error } = await signIn.email({ email, password });

        // Better Auth returns errors rather than throwing, like Eden does.
        if (error) {
          throw new Error(error.message ?? "Could not sign in");
        }

        await navigate({ to: "/notes" });
      }}
      footer={
        <>
          No account?{" "}
          <Link to="/signup" className="underline">
            Sign up
          </Link>
        </>
      }
    />
  );
}
