import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { BackendRequestError } from "@/lib/api";

/** One field-level failure as the backend's error body reports it. */
interface ValidationEntry {
  /** JSON pointer to the field, e.g. `"/title"`. */
  path?: string;
  message?: string;
  summary?: string;
}

interface ValidationErrorBody {
  validationError?: { validation?: ValidationEntry[] };
}

/**
 * Pushes a failed request's errors into a react-hook-form instance.
 *
 * The client-side zod schema exists for immediate feedback; **the server is the
 * authority**. When the two disagree — a rule that only exists server-side, a
 * duplicate email, a race — this puts the server's message on the right field
 * instead of leaving the user with a form that looks valid but will not submit.
 *
 * Backend validation failures carry a JSON pointer per field (`"/title"`), which
 * maps onto the form field of the same name. Anything without a usable pointer,
 * and any non-validation failure such as a Better Auth error, becomes a form-level
 * `root` error.
 *
 * @example
 * onSubmit={form.handleSubmit(async (values) => {
 *   try {
 *     await createNote(values);
 *   } catch (error) {
 *     applyServerErrors(form.setError, error);
 *   }
 * })}
 */
export function applyServerErrors<T extends FieldValues>(setError: UseFormSetError<T>, error: unknown): void {
  const fallback = error instanceof Error ? error.message : "Something went wrong";

  if (!(error instanceof BackendRequestError)) {
    setError("root", { message: fallback });
    return;
  }

  const entries = (error.body as ValidationErrorBody | undefined)?.validationError?.validation ?? [];
  let matched = 0;

  for (const entry of entries) {
    // "/title" -> "title". Nested pointers ("/a/b") become "a.b", which is the
    // path syntax react-hook-form uses for nested fields.
    const field = entry.path?.replace(/^\//, "").replaceAll("/", ".");

    if (!field) {
      continue;
    }

    setError(field as Path<T>, { message: entry.message ?? entry.summary ?? "Invalid value" });
    matched += 1;
  }

  // A 401, a 409, or a validation failure with no usable pointer still has to be
  // shown somewhere, or the form silently does nothing.
  if (matched === 0) {
    setError("root", { message: error.message || fallback });
  }
}
