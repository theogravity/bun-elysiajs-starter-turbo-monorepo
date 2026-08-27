import { queryOptions } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";

/**
 * Every call to the `/users` endpoints lives here.
 *
 * Routes and components import from this module rather than reaching for the Eden
 * client directly, so a change to an endpoint — its path, its query parameters,
 * its response shape — is a change to one file. It also keeps each query key next
 * to the function that fetches it, which is the pair most likely to drift apart.
 *
 * Tests can mock this module (`vi.mock("@/api/users")`) instead of constructing
 * `fetch` responses. The transport itself is covered once, in `__tests__/users.test.ts`.
 */

export const USERS_PAGE_SIZE = 25;

export interface ListUsersParams {
  /** Maximum number of users to return. Defaults to `USERS_PAGE_SIZE`. */
  limit?: number;
  /** Number of users to skip. Defaults to 0. */
  offset?: number;
}

/**
 * Applies defaults once, so the query key and the request are always built from
 * the same values. Without this, `list({})` and `list({ offset: 0 })` would cache
 * under different keys while issuing identical requests.
 */
function withDefaults(params: ListUsersParams = {}): Required<ListUsersParams> {
  return {
    limit: params.limit ?? USERS_PAGE_SIZE,
    offset: params.offset ?? 0,
  };
}

/** `GET /users` — a page of users, newest first. */
export function listUsers(params: ListUsersParams = {}) {
  return unwrap(api.users.get({ query: withDefaults(params) }));
}

/** `GET /users/:userId` — rejects with a `BackendRequestError` (404) if not found. */
export function getUser(userId: string) {
  return unwrap(api.users({ userId }).get());
}

export interface CreateEMailUserInput {
  givenName: string;
  familyName: string;
  email: string;
  password: string;
}

/** `POST /users/email` — creates a user and their e-mail auth provider. */
export function createEMailUser(input: CreateEMailUserInput) {
  return unwrap(api.users.email.post(input));
}

/** Response of {@link listUsers}, inferred from the backend rather than restated. */
export type UserList = Awaited<ReturnType<typeof listUsers>>;

/** A single user as the list endpoint returns it. */
export type User = UserList["users"][number];

/**
 * Query keys for this resource. Building them here means a cache invalidation can
 * target every user query (`userKeys.all`) without a route knowing how keys are
 * shaped.
 */
export const userKeys = {
  all: ["users"] as const,
  lists: () => [...userKeys.all, "list"] as const,
  list: (params: Required<ListUsersParams>) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, "detail"] as const,
  detail: (userId: string) => [...userKeys.details(), userId] as const,
};

/** Query options for the user list, shared by route loaders and components. */
export function usersListQuery(params: ListUsersParams = {}) {
  const resolved = withDefaults(params);

  return queryOptions({
    queryKey: userKeys.list(resolved),
    queryFn: () => listUsers(resolved),
  });
}

/** Query options for a single user. */
export function userDetailQuery(userId: string) {
  return queryOptions({
    queryKey: userKeys.detail(userId),
    queryFn: () => getUser(userId),
  });
}
