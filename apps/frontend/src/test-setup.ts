// The `/vitest` entrypoint registers the matchers against Vitest's `expect`.
// The bare "@testing-library/jest-dom" import expects a global `expect`, which
// only exists when `globals: true` is set in the Vitest config — it is not.
import "@testing-library/jest-dom/vitest";
