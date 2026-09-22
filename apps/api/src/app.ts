import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { createAuth } from "@monstertalk/auth";
import { createDb, schema } from "@monstertalk/db";
import type { Env } from "./env.ts";
import { createMemoryPresence } from "./presence/store.ts";
import { presenceRoutes } from "./routes/presence.ts";
import { profileRoutes } from "./routes/profile.ts";
import { usersRoutes } from "./routes/users.ts";

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

	// 線上狀態的 cache（dev：行程內；prod：換 Durable Object）。某人真的離線時才寫一次 lastSeenAt
	const presence = createMemoryPresence({
		onOffline: (userId, lastSeenAt) => {
			db.update(schema.users)
				.set({ lastSeenAt })
				.where(eq(schema.users.id, userId))
				.catch((error: unknown) => console.error("lastSeenAt update failed", error));
		},
	});

	const app = new Hono();

	// 每個請求一行：方法、路徑、狀態、耗時
	app.use(logger());

	// cookie 要跨 origin 送（前端 6531 → api 4000），CORS 必須指定 origin 並開 credentials；萬用字元 * 不行
	app.use(
		"/api/*",
		cors({
			origin: env.WEB_ORIGIN,
			credentials: true,
			allowHeaders: ["Content-Type"],
			allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		}),
	);

	app.get("/health", (c) => c.json({ ok: true }));

	// 註冊 / 登入 / 登出 / 取 session 全部由 better-auth 處理：
	// POST /api/auth/sign-up/email、POST /api/auth/sign-in/email、POST /api/auth/sign-out、GET /api/auth/get-session
	app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

	// 個人資料：GET/PUT /api/me/profile、GET /api/avatars（requireUser 在裡面掛）
	app.route("/api", profileRoutes(auth, db));
	// 別人的名單與線上狀態，兩支分開：名單變動少、狀態每 30 秒被拉一次
	app.route("/api", usersRoutes(auth, db));
	app.route("/api", presenceRoutes(auth, presence));

	return app;
}
