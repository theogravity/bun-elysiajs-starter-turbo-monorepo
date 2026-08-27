import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { AuthLayout, FormError, SubmitButton } from "@/components/AuthLayout";
import { FormField } from "@/components/FormField";
import { authClient } from "@/lib/auth-client";
import { type ResetPasswordValues, resetPasswordSchema } from "@/lib/auth-schemas";

export const Route = createFileRoute("/reset-password")({
  // Better Auth's emailed link hits the backend first, which validates the token
  // and redirects here with it in the query string.
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  if (!token) {
    return (
      <AuthLayout
        title="Link expired"
        footer={
          <Link to="/forgot-password" className="underline">
            Request a new link
          </Link>
        }
      >
        <p className="text-gray-600 text-sm">This reset link is missing its token, or has already been used.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(async ({ password }) => {
          const { error } = await authClient.resetPassword({ newPassword: password, token });

          if (error) {
            setError("root", { message: error.message ?? "Could not reset the password" });
            return;
          }

          await navigate({ to: "/signin" });
        })}
      >
        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password}
          registration={register("password")}
        />
        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword}
          registration={register("confirmPassword")}
        />
        <FormError message={errors.root?.message} />
        <SubmitButton pending={isSubmitting}>Set new password</SubmitButton>
      </form>
    </AuthLayout>
  );
}
