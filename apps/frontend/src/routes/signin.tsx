import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { AuthLayout, FormError, SubmitButton } from "@/components/AuthLayout";
import { FormField } from "@/components/FormField";
import { signIn } from "@/lib/auth-client";
import { type SignInValues, signInSchema } from "@/lib/auth-schemas";

export const Route = createFileRoute("/signin")({
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  return (
    <AuthLayout
      title="Sign in"
      footer={
        <>
          No account?{" "}
          <Link to="/signup" className="underline">
            Sign up
          </Link>
          {" · "}
          <Link to="/forgot-password" className="underline">
            Forgot password?
          </Link>
        </>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(async (values) => {
          const { error } = await signIn.email(values);

          // Better Auth resolves with an error rather than throwing, so this is
          // surfaced as a form-level message rather than caught.
          if (error) {
            setError("root", { message: error.message ?? "Could not sign in" });
            return;
          }

          await navigate({ to: "/notes" });
        })}
      >
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email}
          registration={register("email")}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password}
          registration={register("password")}
        />
        <FormError message={errors.root?.message} />
        <SubmitButton pending={isSubmitting}>Sign in</SubmitButton>
      </form>
    </AuthLayout>
  );
}
