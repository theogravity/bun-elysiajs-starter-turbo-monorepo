# Where the Project Documentation Lives

The rules in this directory are loaded automatically. **The architecture
documentation is not** — you have to open it. Read it before writing code.

## Read first

`AGENTS.md` at the repository root. It is the entry point: stack, commands, build
order, and — importantly — which parts of the codebase are example scaffolding
meant to be replaced rather than extended.

## Then read the one for what you are touching

| Working on | Read |
|------------|------|
| API routes, services, repositories, migrations, backend tests | `apps/backend/AGENTS.md` |
| React routes, components, data fetching, frontend tests | `apps/frontend/AGENTS.md` |
| Error codes, the API error contract | `packages/backend-errors/README.md` |
| The typed API client | `packages/backend-client/README.md` |
| Writing a migration | `apps/backend/src/db/migrations/README.md` |

`apps/backend/AGENTS.md` opens with a section called "Conventions you will get
wrong if you don't read this". That is not a figure of speech — it covers four
things that are invisible in the surrounding code and that fail at runtime rather
than at compile time. Read those four before your first edit.

## Precedence

A package's `AGENTS.md` is more specific than these rules and wins where they
disagree. If you find an actual contradiction, the documentation is wrong — fix it
rather than picking one silently.
