import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AuthLayout, FormError, SubmitButton } from "@/components/AuthLayout";
import { FormField } from "@/components/FormField";
import { authClient } from "@/lib/auth-client";
import { type ForgotPasswordValues, forgotPasswordSchema } from "@/lib/auth-schemas";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  if (sent) {
    return (
      <AuthLayout title="Check your email">
        <p className="text-gray-600 text-sm">
          If an account exists for that address, a reset link is on its way. In development, read it at{" "}
          <a href="http://localhost:5001" className="underline" target="_blank" rel="noreferrer">
            smtp4dev
          </a>
          .
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      footer={
        <Link to="/signin" className="underline">
          Back to sign in
        </Link>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(async ({ email }) => {
          const { error } = await authClient.requestPasswordReset({
            email,
            redirectTo: `${window.location.origin}/reset-password`,
          });

          if (error) {
            setError("root", { message: error.message ?? "Could not send the email" });
            return;
          }

          // Shown whether or not the address exists, so this cannot be used to
          // discover which addresses are registered.
          setSent(true);
        })}
      >
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email}
          registration={register("email")}
        />
        <FormError message={errors.root?.message} />
        <SubmitButton pending={isSubmitting}>Send reset link</SubmitButton>
      </form>
    </AuthLayout>
  );
}
