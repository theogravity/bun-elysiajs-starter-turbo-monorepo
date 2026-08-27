import { z } from "zod";

/**
 * Client-side validation for the auth forms.
 *
 * These mirror what Better Auth enforces server-side. They exist for immediate
 * feedback, not for security — the server validates every request regardless, and
 * `applyServerErrors` puts its messages back on the right field when the two
 * disagree.
 *
 * Server-side request validation stays in Elysia's `t` (see
 * `apps/backend/AGENTS.md`): it is roughly 18x faster than zod under Bun and is
 * what generates the OpenAPI document.
 */

/** Better Auth's default minimum is 8 characters. */
const password = z.string().min(8, "Use at least 8 characters");

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z.object({
  name: z.string().min(1, "Enter your name"),
  email: z.email("Enter a valid email address"),
  password,
});

export const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address"),
});

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;
