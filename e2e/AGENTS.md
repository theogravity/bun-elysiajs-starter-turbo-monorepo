# End-to-end tests

A real browser against the real frontend, the real API, a real Postgres, and a real
SMTP server. These cover the seams the other suites cannot reach: cookies crossing
origins, a route guard redirecting, and a password-reset link travelling through an
actual inbox.

## Running

```bash
bun run test:e2e:install   # once — downloads Chromium
bun run test:e2e           # from the repo root
```

Docker must be running. `E2E_VERBOSE=1` streams the API and Vite output, which is
the first thing to try when a test fails for no visible reason.

Not part of `turbo test`: it needs Docker plus a browser download, and it is slower
than everything else combined. CI runs it as a separate job.

## How the stack starts

`global-setup.ts` → `stack.ts` owns everything, in one place:

1. Postgres and smtp4dev via Testcontainers, on the **fixed** host ports in `ports.ts`
2. `bun run db:migrate:latest` against that database — shelling out to the real
   command rather than reimplementing it
3. The API and the Vite dev server as detached child processes
4. Polls `/health` and the frontend until both answer

`global-teardown.ts` kills the process groups and stops the containers.

### Why not Playwright's `webServer`

Two reasons, both found the hard way:

- **It starts before `globalSetup`.** The API would boot against a database that
  does not exist yet, fail its health check, and time out after 60 seconds.
- **The config is re-evaluated in every worker.** Starting containers at config
  scope means each worker races to bind the same fixed ports, and all but the first
  fails with `port is already allocated`.

`globalSetup` runs exactly once, in one process. Servers are spawned `detached` so
teardown can kill the whole tree — `bun run` and `vite` both fork children, and
killing only the parent leaves the port held.

### Why fixed ports

Testcontainers would normally assign random ports, but the servers need to know the
database URL before they start, and the tests need to know the frontend URL. The
values in `ports.ts` are offset far from the development defaults so a run cannot
collide with `turbo watch dev` — or with an unrelated project on 5432.

## Writing a test

Each spec signs up its own user with `uniqueEmail`, so specs are independent and can
run in parallel against one database. Do not depend on data another spec created.

**Use `{ exact: true }` on `getByLabel`.** Without it `getByLabel("Password")` also
matches the router devtools' `aria-label="Open match details for /forgot-password"`.
Devtools are hidden under automation (`navigator.webdriver` in `__root.tsx`), but
exact labels keep the tests robust against any future stray label.

### Asserting on email

`mail.ts` polls smtp4dev's API:

```typescript
const body = await waitForEmail({ to: email, subject: "Reset your password" });
await page.goto(extractLink(body));
```

Mail is sent from inside a Better Auth handler and is not awaited by the request, so
it lands shortly after the response — poll, never sleep.

## What is covered

| Spec | Seam it proves |
|------|----------------|
| Sign up → notes | Cookie set cross-origin and accepted on the next API call |
| Verification email | Better Auth → SMTP → inbox |
| Client validation | zod stops the submit before any request is made |
| Wrong password | Server's message reaches a form-level error |
| Password reset | Email → backend token check → redirect → new password → sign in |
| Route guard | Signed-out visitor is redirected |
| Notes CRUD | Protected write, then read back |
| Cross-user isolation | A second browser context cannot see the first user's notes |
