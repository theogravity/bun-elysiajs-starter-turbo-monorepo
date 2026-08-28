import { afterEach, expect } from "bun:test";
import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";

// jest-dom ships its matchers as a plain object for runners it does not know about;
// the `/vitest` and `/jest-globals` entrypoints only wire that object into a
// specific `expect`. `src/test-matchers.d.ts` declares them on bun:test's types.
expect.extend(matchers as never);

// React Testing Library only auto-registers its cleanup when it can see a global
// `afterEach`. Without this the DOM from one test leaks into the next and queries
// start finding duplicate elements.
afterEach(cleanup);
