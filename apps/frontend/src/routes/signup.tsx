import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthForm } from "@/components/AuthForm";
import { signUp } from "@/lib/auth-client";

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Create an account"
      submitLabel="Sign up"
      withName
      onSubmit={async ({ email, password, name }) => {
        const { error } = await signUp.email({ email, password, name });

        if (error) {
          throw new Error(error.message ?? "Could not sign up");
        }

        await navigate({ to: "/notes" });
      }}
      footer={
        <>
          Already have an account?{" "}
          <Link to="/signin" className="underline">
            Sign in
          </Link>
        </>
      }
    />
  );
}
