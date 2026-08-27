import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

export interface FormFieldProps {
  label: string;
  type?: string;
  autoComplete?: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
}

/**
 * One labelled input with its validation message.
 *
 * `aria-invalid` and `role="alert"` are what make the error reachable to screen
 * readers and queryable in tests via `findByRole("alert")`.
 */
export function FormField({ label, type = "text", autoComplete, error, registration }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-medium text-sm">{label}</span>
      <input
        type={type}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className="rounded border border-gray-300 px-3 py-2 aria-[invalid]:border-red-500"
        {...registration}
      />
      {error && (
        <span role="alert" className="text-red-600 text-sm">
          {error.message}
        </span>
      )}
    </label>
  );
}
