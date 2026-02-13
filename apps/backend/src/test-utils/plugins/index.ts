import { Elysia } from "elysia";
import { enableTestLoggerPlugin } from "./enable-test-logger.plugin.js";
import { testHeadersPlugin } from "./test-headers.plugin.js";

export const testPlugins = new Elysia({ name: "test-plugins" }).use(enableTestLoggerPlugin).use(testHeadersPlugin);
