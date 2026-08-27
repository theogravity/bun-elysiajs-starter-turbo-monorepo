# bun-elysiajs-starter-turbo-monorepo

## Aug-27-2026

- **Breaking:** Replace the hand-rolled `users` example with [Better Auth](https://www.better-auth.com/) — email/password, cookie sessions, and the admin plugin (roles, ban, impersonation)
  - Drops the `users` / `user_providers` tables and their repository, service, routes, and schemas
  - Better Auth's models are mapped to plural snake_case in `src/lib/auth.ts` so its tables match the rest of the schema and read correctly through Kysely's `CamelCasePlugin`. Plugin fields map through that plugin's own `schema` option, not the top-level maps
  - `bun run auth:schema` diffs the database against the schema the installed `better-auth` expects. Do **not** use `@better-auth/cli generate`: it is published separately, lags the library, and emits a schema missing `accounts.issuer`, which migrates cleanly and then fails on the first sign-up
  - Adds `zod` as a backend dependency. Nothing imports it — Better Auth's inferred config type references zod internals, and TypeScript cannot emit a declaration naming a type it can only reach through the package store
- **Breaking:** Replace the `users` example resource with `notes`, an app-owned table keyed to an authenticated user. Ownership lives in the service and returns 404 rather than 403, so a probe cannot confirm another user's record exists
- Add email over SMTP (nodemailer) with verification on sign-up and password reset. `docker compose` now runs [smtp4dev](https://github.com/rnwood/smtp4dev) on http://localhost:5001, which captures everything locally
- Add `react-hook-form` + `zod` for client-side form validation. Server-side validation stays in Elysia's `t` — roughly 18x faster under Bun and the source of the OpenAPI document. `applyServerErrors` maps the backend's JSON pointers onto form fields so the server stays the authority
- Add Playwright end-to-end tests in `e2e/`, covering cookies crossing origins, route guards, cross-user isolation, and a password reset through a real inbox. Not part of `turbo test`; CI runs it as a separate job
- Add a `Dockerfile` building the API as a self-contained binary, with a separate `migrate` target for schema changes
- Add graceful shutdown on `SIGTERM`/`SIGINT`, a `/health` readiness probe that checks the database, and a seed that creates the first admin
- **Breaking:** `verify-types` and `test` now declare `dependsOn: ["^build"]`. Without it a package type-checks against stale dependency output and Turbo caches the pass — which is how a deleted route stayed green
- Enable `noImplicitAny`, so a missing type declaration fails as `TS7016` instead of silently degrading to `any`
- Pin the `postgres` image to 16, matching the test suite, and make the compose port configurable via `POSTGRES_PORT`
- Pin GitHub Actions to commit SHAs, restrict workflow token permissions to `contents: read`, and add Dependabot for the actions
- Fixes:
  - `generateTestFacets({ withLogging: true })` never produced output — the header it set was read after the request logger had already been derived
  - `errId` was attached to the shared logger, so it leaked onto every later line including successful requests
  - React Testing Library's cleanup was never registered, so the DOM leaked between frontend tests
  - `clean:dist` and `clean:turbo` deleted directories inside `node_modules`
- Remove the unused `IS_GENERATING_CLIENT` constant and the `ajv` dependency, a type-only import left over from a Fastify port

## Aug-26-2026

- **Breaking:** Upgrade to TypeScript 7 (native Go compiler)
  - Replace removed `moduleResolution: "node"` (node10) with `"bundler"` in the shared tsconfig
  - Remove the removed `baseUrl` option; `paths` entries now carry the `./src/` prefix
  - Set `rootDir` explicitly on the backend — TS 7 no longer infers it from the input files
  - Add `types: ["node"]` and `@types/node` to `backend-errors` — TS 7 no longer auto-includes every `@types` package
  - Add `src/vite-env.d.ts` to the frontend — TS 7 defaults `noUncheckedSideEffectImports` to `true`, which rejects `import "./styles.css"` without it
- **Breaking:** Upgrade to Vite 8 (Rolldown/Oxc) and `@vitejs/plugin-react` 6 (Oxc-based Fast Refresh, no Babel)
- **Breaking:** Upgrade Kysely to 0.29 — `Migrator`/`MigrationProvider` now import from `kysely/migration`, and the package is ESM-only
- **Breaking:** Upgrade `@dotenvx/dotenvx` to 2, `uuid` to 14, `nanoid` to 6, `@commitlint/*` to 21, `@types/node` to 26, `syncpack` to 15, `@testcontainers/postgresql` to 12, `@testing-library/jest-dom` to 7 (adds the now-required `@testing-library/dom` peer)
- Migrate the remaining pnpm references to Bun and pin Bun 1.4.0
  - CI now uses `oven-sh/setup-bun` instead of `pnpm/action-setup` + `actions/setup-node`
  - lefthook hooks run `bun install` / `bun run …`
- Add root `lint`, `test`, and `lint:packages` scripts that CI and the pre-push hook already referenced
- Use `import.meta.dirname` in the frontend Vite/Vitest configs (Vite 8's native config loader does not support `__dirname`)
- Remove the unsupported `tailwindConfig` key from the frontend Biome config — no released Biome accepts it
- Remove the `turbo gen` scaffolding generators (`apps/backend/turbo/`), the `@turbo/gen` dependency, the `generate` turbo task, and the `// Do not remove this comment:` plop anchors they inserted at
- Document the backend's route -> service -> repository layering in `AGENTS.md`, including where each kind of logic belongs and how to add a feature end-to-end now that scaffolding is gone
- Package updates across the board

## Jan-31-2026

- **Breaking:** Migrate from pnpm to Bun workspaces
- **Breaking:** Update engine requirement to Bun
- **Breaking:** Update Node baseline to 24
- Replace bcrypt with bcryptjs for Bun compatibility
- Update scripts to use Bun for TypeScript execution
- Remove tsx dependency (replaced by Bun)
- Add Bun compile script with bytecode generation
- Remove package publishing capability
- Upgrade `@sinclair/typebox` from 0.34.48 to 1.0.80
- Remove ts-node in favor of jiti
- Add dedicated `turbo.json` for each package and app
- Simplify root `turbo.json` to base task definitions
- Update lefthook config and add `lint:staged` scripts
- Add clean scripts (`clean`, `clean:turbo`, `clean:dist`, `clean:hash-runner`)
- Replace pino with loglayer simple-pretty-terminal
- Package updates

## Mar-16-2025

- Remove husky in favor of lefthook
- Use the loglayer pretty terminal for dev and tests modes
- Package updates.

## Jan-20-2025

- Package updates.

## Jan-1-2025

- Package updates.
- Use version 5 of `loglayer`.

## Dec-7-2024

- Package updates.

## Nov-23-2024

- Client SDK generation no longer dependent on the backend build
- Faster openapi.yml generation

## Nov-17-2024

- Remove `lint-staged`. Wasn't being used.
- Update `husky` `commit-msg` to run more linting and formatting checks
- Update packages to latest versions
  * Pinned `@sinclair/typebox` to `0.33.22` and not `0.34.00` due to [a breaking change](https://github.com/sinclairzx81/typebox/blob/master/changelog/0.34.0.md) with `Static` 
- Removes query params from `apiPath` in the log context for security reasons
- **Breaking:** Removes `strictNullChecks=false` in the tsconfig for better type safety
- **Breaking**: `typechecks` script is now `verify-types`

## Sept-28-2024

- Breaking: Change the format of `ApiError` to simplify validation errors
- Update the error handler to use the new `ApiError` format
- Package updates
- Add url path to log context

## Sept-21-2024

- Upgrade fastify to v5, all packages to latest versions
- Better error handling for the backend
- Fixed bugs around logs not showing in certain cases during tests
- Add package publishing support
- Add dev build caching for faster builds during dev
- Removed AJV sanitize plugin. In real-world usage, you wouldn't want to sanitize the input to your API immediately, but later on.

## Sept-07-2024

- Added better formatting for logs
- Test response code failures now show the request and response outputs in the log
- Fix updatedAt type
- Disabled logging for tests by default now that we have proper error logging for request failures

## Sep-06-2024

- Enabled logging for tests by default
- Added auto-logging for test failures

## Sep-01-2024

- Added type exports to Request / Response in the API definitions
- Updated test to include Response typings
- Updated logging to pretty print for non-prod
- Fixed issue around error handling where the error was not being parsed properly
- Updated packages to latest versions
- Added linting / formatting to the backend-errors package
- Removed --watch flag from backend dev script
  * Should now run `turbo watch dev` to watch for changes
- Rename the `decorators` directories to `plugins` since not all items in it are decorators

## Aug-17-2024

First version.
