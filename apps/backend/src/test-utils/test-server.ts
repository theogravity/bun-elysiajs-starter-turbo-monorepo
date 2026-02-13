import { treaty } from "@elysiajs/eden";
import { createApp } from "@/server.js";
import { testPlugins } from "@/test-utils/plugins/index.js";

export const testApp = createApp().use(testPlugins);

export const testApi = treaty(testApp);
