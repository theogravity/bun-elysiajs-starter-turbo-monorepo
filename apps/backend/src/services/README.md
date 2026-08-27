# Services

Business logic, orchestration across repositories, and the transaction boundary.
Routes call services; services call repositories.

- Open transactions with `this.db.transaction().execute(...)` and thread the
  resulting `db` handle into each repository call so the writes are atomic. Return
  the value from inside the callback rather than assigning to an outer variable.
- Reach sibling services through `this.services`, which `ApiContext` populates via
  `withServices()` after construction.
- **Signal failure by returning a domain outcome, not by throwing** — `undefined`
  for a missing row, or a discriminated result for something richer. The route maps
  it onto an HTTP status.

Services return domain and DB types. They never import Elysia, set status codes, or
build response bodies. Full layering and error rules: `apps/backend/AGENTS.md`.

https://www.coreycleary.me/what-is-the-difference-between-controllers-and-services-in-node-rest-apis
