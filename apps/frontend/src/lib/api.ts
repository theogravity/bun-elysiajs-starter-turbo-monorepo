import { createBackendClient } from "@internal/backend-client";
import { getLogger } from "@/lib/logger";

/**
 * Base URL of the backend API. Override it per-environment with `VITE_API_URL`
 * (see `.env.example`); the default matches `SERVER_PORT` in the backend's
 * `.env.example`.
 */
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3080";

/**
 * Singleton Eden Treaty client.
 *
 * The client is fully typed from the backend's `App` type — there is no code
 * generation step, but `turbo build` must have emitted `@internal/backend`'s
 * types for new routes to show up here.
 */
export const api = createBackendClient(API_URL);

/**
 * The error body every failed backend request returns, produced by the backend's
 * global `errorHandler`.
 */
export interface BackendErrorBody {
  errId: string;
  code: string;
  message: string;
  statusCode: number;
  metadata?: Record<string, unknown>;
}

/**
 * Thrown by {@link unwrap} when the backend returns an error response. Carries the
 * backend's error `code` so callers can branch on it via `BackendErrorCodes`.
 */
export class BackendRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly errId?: string;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    const parsed = (body ?? {}) as Partial<BackendErrorBody>;

    super(parsed.message ?? `Request failed with status ${status}`);

    this.name = "BackendRequestError";
    this.status = status;
    this.code = parsed.code ?? "UNKNOWN";
    this.errId = parsed.errId;
    this.body = body;
  }
}

/**
 * Eden Treaty resolves to `{ data, error }` rather than throwing, which TanStack
 * Query cannot detect on its own. Wrap every call in `unwrap` so a failed request
 * becomes a rejected promise and lands in the query's `error`.
 *
 * @example
 * const { data } = useQuery({
 *   queryKey: ["notes", { limit, offset }],
 *   queryFn: () => unwrap(api.notes.get({ query: { limit, offset } })),
 * });
 */
export async function unwrap<T>(
  request: Promise<{
    data: T | null;
    error: { status: number; value: unknown } | null;
  }>,
): Promise<T> {
  const { data, error } = await request;

  if (error) {
    const failure = new BackendRequestError(error.status, error.value);

    // Logged here so every failed call is recorded once, whoever made it. `errId`
    // is the backend's identifier for this exact failure — quoting it in a bug
    // report is what lets someone find the matching server-side log line.
    getLogger()
      .withMetadata({ status: failure.status, code: failure.code, errId: failure.errId })
      .withError(failure)
      .error("Backend request failed");

    throw failure;
  }

  return data as T;
}
