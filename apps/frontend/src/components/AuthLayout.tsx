export interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/** Centred single-column shell shared by every auth screen. */
export function AuthLayout({ title, children, footer }: AuthLayoutProps) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center p-8">
      <h1 className="mb-6 font-bold text-2xl">{title}</h1>
      {children}
      {footer && <p className="mt-4 text-gray-600 text-sm">{footer}</p>}
    </main>
  );
}

/** Form-level error, for failures that do not belong to one field. */
export function FormError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <p role="alert" className="text-red-600 text-sm">
      {message}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-gray-900 px-3 py-2 font-medium text-white disabled:opacity-50"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
