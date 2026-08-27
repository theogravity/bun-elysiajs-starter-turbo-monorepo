import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { AuthLayout, FormError, SubmitButton } from "@/components/AuthLayout";
import { FormField } from "@/components/FormField";
import { signUp } from "@/lib/auth-client";
import { type SignUpValues, signUpSchema } from "@/lib/auth-schemas";

export const Route = createFileRoute("/signup")({
  component: SignUpPage,
});

function SignUpPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) });

  return (
    <AuthLayout
      title="Create an account"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/signin" className="underline">
            Sign in
          </Link>
        </>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(async (values) => {
          const { error } = await signUp.email(values);

          if (error) {
            // A duplicate address is the common case here, and only the server
            // can know about it.
            setError("root", { message: error.message ?? "Could not sign up" });
            return;
          }

          await navigate({ to: "/notes" });
        })}
      >
        <FormField label="Name" autoComplete="name" error={errors.name} registration={register("name")} />
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
          autoComplete="new-password"
          error={errors.password}
          registration={register("password")}
        />
        <FormError message={errors.root?.message} />
        <SubmitButton pending={isSubmitting}>Sign up</SubmitButton>
      </form>
    </AuthLayout>
  );
}
