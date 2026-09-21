import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { loadEnv } from "./env.ts";

const env = loadEnv(process.env);
const app = createApp(env);

serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
	console.log(`api listening on http://localhost:${info.port}`);
});
