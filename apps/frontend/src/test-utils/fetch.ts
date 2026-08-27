import { vi } from "vitest";

/** A request the stub intercepted. */
export interface CapturedRequest {
  /** Upper-cased HTTP method. */
  method: string;
  /** Parsed request URL — use `.pathname` and `.searchParams` to assert. */
  url: URL;
  /** Raw request body, if one was sent. */
  body?: string;
  /** Request headers. */
  headers: Headers;
  /** Credentials mode, which is what carries the session cookie cross-origin. */
  credentials?: RequestCredentials;
  /** The request body parsed as JSON, or `undefined` if there was none. */
  json<T = unknown>(): T | undefined;
}

/** What the stub should reply with. */
export interface StubbedResponse {
  /** Serialized as JSON. */
  body?: unknown;
  /** Defaults to 200. */
  status?: number;
  /** Merged over `content-type: application/json`. */
  headers?: Record<string, string>;
}

type Responder = (request: CapturedRequest) => StubbedResponse;

/**
 * Replaces the global `fetch` and records what was requested.
 *
 * Use this **only** in `src/api/__tests__/` — it is how the transport layer is
 * tested. Component and route tests mock `@/api/{resource}` instead, so they never
 * need to know how a request is made. See `apps/frontend/AGENTS.md`, "Testing".
 *
 * The stub is removed automatically before each test (`unstubGlobals` in
 * `vitest.config.ts`), so no `afterEach` cleanup is required.
 *
 * @param respond - The JSON body to reply with, or a function returning a
 *   {@link StubbedResponse} per request when different calls need different replies.
 * @param options - `status` for the reply. Ignored when `respond` is a function.
 * @returns A live array of captured requests, appended to as calls are made.
 *
 * @example
 * const requests = stubFetch({ users: [], total: 0 });
 * await listUsers();
 * expect(requests[0]?.url.pathname).toBe("/users");
 *
 * @example
 * stubFetch({ code: "NOT_FOUND_ERROR" }, { status: 404 });
 * await expect(getUser("nope")).rejects.toBeInstanceOf(BackendRequestError);
 */
export function stubFetch(respond: unknown | Responder, options: { status?: number } = {}): CapturedRequest[] {
  const captured: CapturedRequest[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const isRequest = typeof input === "object" && "url" in input;
      const rawBody = typeof init?.body === "string" ? init.body : undefined;

      const request: CapturedRequest = {
        method: (init?.method ?? (isRequest ? input.method : "GET")).toUpperCase(),
        url: new URL(isRequest ? input.url : String(input)),
        body: rawBody,
        headers: new Headers(init?.headers ?? (isRequest ? input.headers : undefined)),
        credentials: init?.credentials ?? (isRequest ? input.credentials : undefined),
        json<T>() {
          return rawBody === undefined ? undefined : (JSON.parse(rawBody) as T);
        },
      };

      captured.push(request);

      const reply: StubbedResponse =
        typeof respond === "function" ? (respond as Responder)(request) : { body: respond, status: options.status };

      return new Response(JSON.stringify(reply.body ?? null), {
        status: reply.status ?? 200,
        headers: { "content-type": "application/json", ...reply.headers },
      });
    }),
  );

  return captured;
}
