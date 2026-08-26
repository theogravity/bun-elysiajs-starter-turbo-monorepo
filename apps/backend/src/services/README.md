# Services

Services hold the business logic of the application: validation rules, derived
values, orchestration across repositories, and transaction boundaries.

Routes call services; services call repositories. A service opens a transaction
with `this.db.transaction().execute(...)` and threads the resulting `db` handle
into each repository call so the writes are atomic.

Services may call sibling services through `this.services`, which `ApiContext`
populates via `withServices()` after construction.

Services return domain and DB types. They must not import Elysia, set status
codes, or build HTTP response bodies — that is the route's job.

They signal failure by returning a domain outcome, not by throwing: `undefined`
for a missing row, or a discriminated result for something richer. The route maps
that onto an HTTP status with `status()` + `apiErrorBody()`. Reserve
`throwApiError` for genuinely unexpected failures. See `apps/backend/AGENTS.md`
for the full layering and error-handling rules.

https://www.coreycleary.me/what-is-the-difference-between-controllers-and-services-in-node-rest-apis
