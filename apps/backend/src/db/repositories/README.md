# Database repositories

Each repository owns database access for a single table. Repositories are the only
place in the backend that builds queries.

Every method takes the `db` handle as an explicit parameter rather than reading a
stored connection, so a service can pass a transaction handle and have several
repository calls share one transaction.

Keep repositories free of business logic: no hashing, no permission checks, no
orchestration across tables. A repository never calls another repository or a
service — combining entities is the service's job.

**Do not use a repository from a route.** Routes go through services, and the
service uses the repositories it needs. See `apps/backend/AGENTS.md` for the full
layering rules.
