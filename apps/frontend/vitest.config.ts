import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

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
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
