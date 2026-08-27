import { startStack } from "./stack";

/** Runs once, in the main process, before any worker starts. */
export default async function globalSetup(): Promise<void> {
  await startStack();
}
