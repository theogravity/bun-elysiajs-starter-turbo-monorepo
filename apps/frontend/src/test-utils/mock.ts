import type { Mock } from "bun:test";

/**
 * Types an already-mocked function so its `mock*` helpers are reachable.
 *
 * This is bun:test's missing equivalent of Vitest's `vi.mocked`: `mock.module`
 * replaces a module's exports at runtime, but the imported binding keeps the real
 * function's type, so `authClient.getSession.mockResolvedValue(...)` does not
 * typecheck. Casting in one named place keeps that noise out of the tests.
 *
 * The original signature is preserved, so a mocked value still has to match what
 * the real function returns — pass `as never` for a partial fixture, as the route
 * tests do.
 *
 * @param fn - A function whose module has been replaced with `mock.module`.
 *
 * @example
 * asMock(useSession).mockReturnValue({ data: null, isPending: false } as never);
 */
export function asMock<T extends (...args: never[]) => unknown>(fn: T): Mock<T> {
  return fn as unknown as Mock<T>;
}
