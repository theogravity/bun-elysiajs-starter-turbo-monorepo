import { GlobalRegistrator } from "@happy-dom/global-registrator";

/**
 * Installs happy-dom's `window`, `document`, and friends as globals.
 *
 * This is the **first** preload in `bunfig.toml`, and it has to be a file of its
 * own. `import` declarations are hoisted, so anything imported alongside
 * `GlobalRegistrator` would be evaluated before `register()` runs — and
 * `@testing-library/dom` binds `screen` to `document.body` at module scope, so it
 * throws "a global document has to be available" if it loads first.
 */
GlobalRegistrator.register();

// Vite defines `import.meta.env.MODE`; Bun backs `import.meta.env` with
// `process.env`, so set it here. `src/lib/logger.ts` reads it to stay quiet during
// tests, and `__root.tsx` reads it to keep the devtools unmounted.
process.env.MODE ??= "test";
