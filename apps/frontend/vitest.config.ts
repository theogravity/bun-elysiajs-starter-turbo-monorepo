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
    },
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "./src"),
        },
    },
});
