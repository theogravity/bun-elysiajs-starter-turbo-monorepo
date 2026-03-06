# Verification

**Always run verification after making code changes.** Don't wait to be asked or until you "feel confident" - run these immediately after any modification:

```bash
bun run verify-types
bun run lint
bun run test
```

If any of these fail, fix the issues before considering the task complete. Do not proceed to commits or other work until all three pass.
