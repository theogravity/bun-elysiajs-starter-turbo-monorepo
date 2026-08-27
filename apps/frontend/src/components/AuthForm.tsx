import { useState } from "react";

export interface AuthFormProps {
  title: string;
  submitLabel: string;
  /** Shown above the email field. Sign-up collects a name as well. */
  withName?: boolean;
  onSubmit: (values: { email: string; password: string; name: string }) => Promise<void>;
  footer: React.ReactNode;
}

/**
 * Shared email/password form for the sign-in and sign-up screens.
 *
 * Deliberately plain Tailwind. Better Auth also publishes prebuilt screens through
 * its shadcn registry (`shadcn add @better-auth-ui/auth`) if you would rather adopt
 * shadcn/ui — this template stays component-library free.
 */
export function AuthForm({ title, submitLabel, withName = false, onSubmit, footer }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await onSubmit({ email, password, name });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-8">
      <h1 className="mb-6 font-bold text-2xl">{title}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {withName && (
          <label className="flex flex-col gap-1">
            <span className="font-medium text-sm">Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-gray-300 px-3 py-2"
            />
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="font-medium text-sm">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium text-sm">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={withName ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>

        {error && (
          <p role="alert" className="text-red-600 text-sm">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-gray-900 px-3 py-2 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Please wait…" : submitLabel}
        </button>
      </form>

      <p className="mt-4 text-gray-600 text-sm">{footer}</p>
    </main>
  );
}
