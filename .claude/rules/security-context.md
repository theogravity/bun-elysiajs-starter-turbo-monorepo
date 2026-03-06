# Security Context

This is a **local-only service** designed to run on a developer's machine or within a trusted local network.

## Authentication

No authentication is required. The API endpoints are intentionally open for local development tooling and log aggregation.

## CORS

Permissive CORS is acceptable since the service is not exposed to the public internet.

## Rate Limiting

No rate limiting is implemented. This is intentional for a local service where performance and simplicity are prioritized over protection from abuse.

## Input Validation

The following design decisions are intentional for a local development service:

- **No string length limits on log fields**: Log messages, stack traces, and metadata can vary significantly in size. Limiting them would break legitimate use cases.
- **No limits on distinct value queries**: Services like `getDistinctServices()` return all values without pagination. For local development, the number of unique services/instances is expected to be small.
- **Configurable batch ingestion limit**: Batch size is limited by `MAX_BATCH_SIZE` config to prevent accidental resource exhaustion while still allowing flexibility.

## When This Changes

If this service is ever deployed to a shared or public environment, the following must be implemented:
- Authentication (API keys or OAuth)
- Proper CORS origin validation
- Rate limiting
- HTTPS enforcement
- Input length validation
- Pagination for all list endpoints
