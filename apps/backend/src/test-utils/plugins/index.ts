import { Elysia } from "elysia";
import { testHeadersPlugin } from "./test-headers.plugin.js";

export const testPlugins = new Elysia({ name: "test-plugins" }).use(testHeadersPlugin);
