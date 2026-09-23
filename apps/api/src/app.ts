import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { createAuth } from "@monstertalk/auth";
import { createDb, schema } from "@monstertalk/db";
import type { Env } from "./env.ts";
import { logError } from "./log.ts";
import { notify } from "./notify.ts";
import { createMemoryPresence } from "./presence/store.ts";
import { clientLogRoutes } from "./routes/clientLog.ts";
import { notificationsRoutes } from "./routes/notifications.ts";
import { presenceRoutes } from "./routes/presence.ts";
import { profileRoutes } from "./routes/profile.ts";
import { roomsRoutes } from "./routes/rooms.ts";
import { usersRoutes } from "./routes/users.ts";
import { videoRoutes } from "./routes/video.ts";
import { wordsRoutes } from "./routes/words.ts";

/**
 * 組出 Hono app，不綁定任何執行環境。
 * dev 由 index.ts 用 @hono/node-server 跑；上 Cloudflare Workers 時改成 export default { fetch: app.fetch }，這裡不用動。
 * 一併回 auth 與 db：WebSocket 的握手（白板、之後的聊天）不走 Hono，index.ts 要拿它們驗 session 與查子單。
 */
export function createApp(env: Env) {
	const db = createDb(env.DATABASE_URL);
	const auth = createAuth({
		db,
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.API_ORIGIN,
		trustedOrigins: env.WEB_ORIGINS,
		// 第一則通知：歡迎。語言照註冊請求的 Accept-Language（個人資料還是預設值），沒有就 en（跟 proxy 的預設一致）
		onUserCreated: async (user, { acceptLanguage }) => {
			const lang = acceptLanguage?.trim().toLowerCase().startsWith("zh") ? "zh" : "en";
			await notify(db, user.id, "welcome", { lang }).catch((error: unknown) =>
				logError("notify.welcome", error, { userId: user.id }),
			);
		},
	});

	// 線上狀態的 cache（dev：行程內；prod：換 Durable Object）。某人真的離線時才寫一次 lastSeenDate
	const presence = createMemoryPresence({
		onOffline: (userId, lastSeenDate) => {
			db.update(schema.users)
				.set({ lastSeenDate })
				.where(eq(schema.users.id, userId))
				.catch((error: unknown) => logError("presence.lastSeenDate", error, { userId }));
		},
	});

	const app = new Hono();

	// 每個請求一個 id（回應 header X-Request-Id 也有），錯誤 log 與 500 回應都帶它，前後端對得起來
	app.use(requestId());
	// 每個請求一行：方法、路徑、狀態、耗時
	app.use(logger());

	// 沒被路由接住的例外：寫一行帶 requestId / 路徑 / 使用者的 log，回 500 JSON（不回 Hono 預設的純文字）
	app.onError((error, c) => {
		const id = c.get("requestId");
		// requireUser 有掛的路由才有 user；app 這層的 Variables 型別不知道它，直接從 var 拿
		const user = (c.var as { user?: { id: string } }).user;
		logError("http", error, { requestId: id, method: c.req.method, path: c.req.path, userId: user?.id });
		return c.json({ error: "internal", requestId: id }, 500);
	});
	app.notFound((c) => c.json({ error: "notFound", path: c.req.path }, 404));

	// cookie 要跨 origin 送（前端 6531 → api 4000），CORS 必須指定 origin 並開 credentials；萬用字元 * 不行
	app.use(
		"/api/*",
		cors({
			origin: env.WEB_ORIGINS,
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
	app.route("/api", presenceRoutes(auth, presence, db));
	// 房間：GET /api/me/schedule（週曆）、POST /api/rooms（開房）
	app.route("/api", roomsRoutes(auth, db));
	// 單字庫：GET /api/me/words（整本）、GET / POST /api/rooms/:code/words（這場）、DELETE /api/me/words/:id
	app.route("/api", wordsRoutes(auth, db));
	// 視訊：Cloudflare Realtime SFU 的代打（開 session、推 / 拉 track、renegotiate、關 track）
	app.route("/api", videoRoutes(auth, db, env.REALTIME));
	// 通知：GET /api/me/notifications（去重後的清單 + 未讀數）、POST /api/me/notifications/read（打開鈴鐺整批已讀）
	app.route("/api", notificationsRoutes(auth, db));
	// 前端的例外丟過來一起留痕
	app.route("/api", clientLogRoutes(auth));

	return { app, auth, db };
}
