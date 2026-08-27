import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// The `/vitest` entrypoint above registers the matchers against Vitest's `expect`.
// The bare "@testing-library/jest-dom" import expects a global `expect`, which only
// exists when `globals: true` is set in the Vitest config — it is not.
//
// For the same reason React Testing Library does not auto-register its cleanup, so
// without this the DOM from one test leaks into the next and queries start finding
// duplicate elements.
afterEach(cleanup);
