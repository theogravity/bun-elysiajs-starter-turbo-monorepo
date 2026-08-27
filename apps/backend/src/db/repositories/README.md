# Database repositories

One repository per table. This is the only layer that builds queries.

Two rules that are easy to get wrong:

- **Every method takes `db` as an explicit parameter** rather than reading a stored
  connection, so a service can pass a transaction handle and have several calls
  share one transaction. Keep this when adding methods.
- **Return `undefined` for a missing row** (`executeTakeFirst`). Whether that is an
  error is the service's decision, not the repository's.

No business logic, no calls to another repository or a service, and never used
directly from a route. Full layering rules: `apps/backend/AGENTS.md`.
