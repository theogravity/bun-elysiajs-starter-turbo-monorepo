import { stopStack } from "./stack";

/** Stops the containers started while `playwright.config.ts` was evaluated. */
export default async function globalTeardown(): Promise<void> {
  await stopStack();
}
