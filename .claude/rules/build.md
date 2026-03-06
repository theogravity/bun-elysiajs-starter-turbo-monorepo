# Build

## When to Run `turbo build`

Run `turbo build` after making changes to:

- **Backend API routes or schemas** - regenerates `@internal/backend-client` from OpenAPI spec
- **Any package in `packages/`** - ensures dependent apps receive the updates

```bash
turbo build
```

The Turbo pipeline handles the correct build order automatically.
