import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

/**
 * Teaches bun:test's `expect` about the jest-dom matchers registered in
 * `src/test-setup.ts`. This is the bun:test equivalent of the module augmentation
 * `@testing-library/jest-dom/vitest` performs for Vitest.
 */
declare module "bun:test" {
  interface Matchers<T = unknown> extends TestingLibraryMatchers<never, T> {}
  interface AsymmetricMatchers extends TestingLibraryMatchers<never, unknown> {}
}
