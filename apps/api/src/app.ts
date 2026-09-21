import { Hono } from "hono";
import { cors } from "hono/cors";
import { createAuth, requireUser } from "@monstertalk/auth";
import { createDb } from "@monstertalk/db";
import type { Env } from "./env.ts";

/**
 * 組出 Hono app，不綁定任何執行環境。
 * dev 由 index.ts 用 @hono/node-server 跑；上 Cloudflare Workers 時改成 export default { fetch: app.fetch }，這裡不用動。
 */
export function createApp(env: Env) {
	const db = createDb(env.DATABASE_URL);
	const auth = createAuth({
		db,
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.API_ORIGIN,
		trustedOrigins: [env.WEB_ORIGIN],
	});

	const app = new Hono();

	// cookie 要跨 origin 送（前端 6531 → api 4000），CORS 必須指定 origin 並開 credentials；萬用字元 * 不行
	app.use(
		"/api/*",
		cors({
			origin: env.WEB_ORIGIN,
			credentials: true,
			allowHeaders: ["Content-Type"],
			allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
		}),
	);

	app.get("/health", (c) => c.json({ ok: true }));

	// 註冊 / 登入 / 登出 / 取 session 全部由 better-auth 處理：
	// POST /api/auth/sign-up/email、POST /api/auth/sign-in/email、POST /api/auth/sign-out、GET /api/auth/get-session
	app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

	// 受保護路由的樣板：requireUser 沒過就 401，過了 c.var.user 有型別
	app.get("/api/me", requireUser(auth), (c) => c.json(c.var.user));

	return app;
}
