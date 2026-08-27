# syntax=docker/dockerfile:1
#
# Builds the API server as a single self-contained binary.
#
#   docker build -t backend .
#   docker run --rm -p 3080:3080 --env-file apps/backend/.env backend
#
# Migrations are NOT run by this image — build the `migrate` target for those.
# `runtime` is intentionally the last stage so a bare `docker build` produces the
# server rather than the migration job.

# ---------------------------------------------------------------------------
# deps: install once, in its own layer, keyed only on the manifests
# ---------------------------------------------------------------------------
FROM oven/bun:1.4.0 AS deps
WORKDIR /app

# Copying only manifests first means a source change does not re-run the install.
COPY package.json bun.lock ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/backend-client/package.json packages/backend-client/
COPY packages/backend-errors/package.json packages/backend-errors/
COPY packages/tsconfig/package.json packages/tsconfig/

RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# build: compile the server to a binary
# ---------------------------------------------------------------------------
FROM deps AS build
WORKDIR /app

COPY . .

# `@internal/backend` imports `@internal/backend-errors`, which resolves to that
# package's dist, so it has to be built before the binary is compiled.
RUN bunx turbo build --filter=@internal/backend-errors

# Produces a bytecode-compiled binary with the Bun runtime embedded. This is why
# the codebase bans dynamic imports: `bun build --compile` cannot see through them,
# and the module would be missing at runtime.
RUN cd apps/backend && bun run compile

# ---------------------------------------------------------------------------
# migrate: run migrations and seeds as a separate step
# ---------------------------------------------------------------------------
# Migrations are TypeScript executed through kysely-ctl, so they need the Bun
# runtime and the source tree rather than the compiled binary. Build this target
# and run it as a job or init container before rolling out a new `runtime`:
#
#   docker build --target migrate -t backend-migrate .
#   docker run --rm --env-file apps/backend/.env backend-migrate
#
FROM build AS migrate
WORKDIR /app/apps/backend

CMD ["bun", "run", "db:migrate:latest"]

# ---------------------------------------------------------------------------
# runtime: just the binary
# ---------------------------------------------------------------------------
FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --system --uid 10001 --no-create-home app

COPY --from=build /app/apps/backend/dist/backend /app/backend

USER 10001
EXPOSE 3080

ENV NODE_ENV=production

# The server handles SIGTERM and closes the pool, so run it as PID 1 without a
# shell wrapper that would swallow the signal.
CMD ["/app/backend"]
