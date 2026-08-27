# Security Context

This is a **starter template**. Authentication is real and working; most of the
hardening around it is not. Treat the gaps below as gaps, not as decisions to
preserve.

## What the template ships today

| Concern | State |
|---------|-------|
| Authentication | **Better Auth**, email and password, cookie sessions. Configured in `apps/backend/src/lib/auth.ts`, mounted at `/api/auth/*`. |
| Authorization | Per-route via the `auth: true` macro (`src/plugins/auth.plugin.ts`), and per-record in services — see `NotesService.getOwnedNote`. Roles come from the Better Auth admin plugin. |
| Password storage | Better Auth's default hashing (scrypt). Not hand-rolled. |
| Session storage | Rows in `sessions`, revocable, with a cookie the browser sends. |
| CORS | Restricted to `FRONTEND_URL` with `credentials: true`, because cookie auth cannot use a wildcard origin. |
| Email verification | **Off.** `emailVerified` is stored but nothing sends mail. Enable it before trusting an address. |
| Rate limiting | **None.** Sign-in and sign-up can be brute forced. |
| Transport | Plain HTTP locally. No HTTPS enforcement or HSTS. |
| Secret management | `BETTER_AUTH_SECRET` from `.env`. Fine locally; use a real secret store in production, and never ship the example value. |
| Input validation | Every route validates through an Elysia `t` schema. Better Auth validates its own endpoints. |
| SQL injection | Not a concern. Kysely parameterizes; no raw SQL is interpolated from user input. |
| Error responses | Safe in production. `IS_PROD` switches to `toJSONSafe()`, which omits stack, `causedBy`, and unsafe `metadata`. |

## Writing an authenticated route

Add `auth: true` and read `user` from the handler context:

```typescript
new Elysia().use(contextPlugin).use(authPlugin).get("/mine", ({ user }) => user.id, { auth: true });
```

Take the user id **from the session, never from the request**. A route that accepts
a `userId` parameter and trusts it has no authorization at all.

Ownership checks belong in the service, not the route, so every caller gets them.
`NotesService.getOwnedNote` is the example: it returns `undefined` for both "no such
note" and "not your note", and the route turns that into a 404. Returning 403 for
the second case would confirm the record exists.

## Admin

The Better Auth admin plugin adds `role` to users and endpoints for listing, role
changes, banning, and impersonation. The **first** admin has to be promoted out of
band — the endpoints require an existing admin:

```sql
update users set role = 'admin' where email = 'you@example.com';
```

Impersonation is enabled. It is genuinely useful and genuinely dangerous; disable it
or restrict it before production if you do not need it.

## Before deploying anywhere shared

Turn on email verification; add rate limiting to the auth endpoints; enforce HTTPS;
move `BETTER_AUTH_SECRET` into a secret store; restrict CORS to real origins; and
decide whether impersonation should exist at all.
