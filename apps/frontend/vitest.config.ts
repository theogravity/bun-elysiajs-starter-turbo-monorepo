import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
    plugins: [react()],
    test: {
        name: "frontend",
        environment: "happy-dom",
        include: ["src/**/?(*.)+(spec|test).[jt]s?(x)"],
        setupFiles: ["src/test-setup.ts"],
        // Restores anything vi.stubGlobal replaced before each test, so a fetch
        // stub cannot leak between tests in the same file.
        unstubGlobals: true,
    },
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
        },
    },
});
