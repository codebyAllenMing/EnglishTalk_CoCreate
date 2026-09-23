import { readFileSync } from "node:fs";
import { createServer as createHttpsServer } from "node:https";
import { resolve } from "node:path";
import { serve } from "@hono/node-server";
import { verifySession } from "@monstertalk/auth";
import { createLiveHub } from "@monstertalk/live";
import { attachLiveServer, type UpgradeDecision as LiveDecision } from "@monstertalk/live/node";
import { createWhiteboardHub } from "@monstertalk/whiteboard";
import { attachWhiteboardServer, type UpgradeDecision } from "@monstertalk/whiteboard/node";
import { createApp } from "./app.ts";
import { loadEnv } from "./env.ts";
import { logError, logInfo } from "./log.ts";
import { startReminders } from "./reminders.ts";
import { ROOM_TYPES } from "@monstertalk/db/schema";
import { roomAccess, roomUser } from "./rooms/access.ts";

// 沒人接的 promise rejection 預設會讓 Node 整個掛掉（v15 起）；留痕、不掛。真正的 uncaughtException 狀態不可信，留痕後退出
process.on("unhandledRejection", (reason) => logError("process.unhandledRejection", reason));
process.on("uncaughtException", (error) => {
	logError("process.uncaughtException", error);
	process.exit(1);
});

const env = loadEnv(process.env);
const { app, auth, db } = createApp(env);

/**
 * dev 一律走 https（使用者習慣；視訊的 getUserMedia 在 localhost 以外也非 https 不可）。
 * 憑證跟前端共用 Next `--experimental-https` 用 mkcert 產的那一份（apps/web/certificates/），路徑由 .env.local 的 TLS_* 指定；
 * 沒給就是 http（prod 上 Workers 不經過這裡）。
 */
const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const tls = env.TLS && {
	cert: readFileSync(resolve(REPO_ROOT, env.TLS.cert)),
	key: readFileSync(resolve(REPO_ROOT, env.TLS.key)),
};
const scheme = tls ? "https" : "http";
const server = tls
	? serve({ fetch: app.fetch, port: env.API_PORT, createServer: createHttpsServer, serverOptions: tls }, (info) => {
			console.log(`api listening on ${scheme}://localhost:${info.port}`);
		})
	: serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
			console.log(`api listening on ${scheme}://localhost:${info.port}`);
		});

/**
 * 白板的 WebSocket 掛在同一個 http server 上（路徑 /api/rooms/:code/whiteboard）。
 * 這裡是安全層：cookie 驗 session → roomAccess 查子單與時間窗，任何一關沒過握手就被拒，
 * 直接開 WS 的人在這裡被擋掉。頁面那層的判斷只是體驗。
 */
// serve() 的型別是 http / http2 / https 的聯集；attach 只要 upgrade 事件，http.Server 與 https.Server 都有
if (!("on" in server)) throw new Error("expected an http(s).Server for WebSocket upgrades");
const whiteboard = createWhiteboardHub({ log: (m) => logInfo("whiteboard", m) });
attachWhiteboardServer(server, {
	hub: whiteboard,
	origin: env.WEB_ORIGINS,
	log: (m) => logInfo("whiteboard", m),
	onError: (error, context) => logError("whiteboard", error, context),
	authorize: async (req, code): Promise<UpgradeDecision> => {
		const session = await verifySession(auth, new Headers({ cookie: req.headers.cookie ?? "" }));
		if (!session) return { ok: false, status: 401, reason: "no session" };
		const access = await roomAccess(db, session.user.id, code);
		if (access.ok) return { ok: true, endDate: access.room.endDate };
		const status = access.reason === "notFound" ? 404 : access.reason === "cancelled" ? 410 : 403;
		return { ok: false, status, reason: access.reason };
	},
});

/**
 * 聊天 + 計時器（之後也是反應）的 WebSocket，路徑 /api/rooms/:code/live，同一道門，另外把人查出來交給 hub。
 * 計時器從房間 startDate 自動起跑、先跑 roomType 的 to（要學習的那一語）。
 */
const live = createLiveHub({ log: (m) => logInfo("live", m), onError: (error, context) => logError("live", error, context) });
attachLiveServer(server, {
	hub: live,
	origin: env.WEB_ORIGINS,
	log: (m) => logInfo("live", m),
	onError: (error, context) => logError("live", error, context),
	authorize: async (req, code): Promise<LiveDecision> => {
		const session = await verifySession(auth, new Headers({ cookie: req.headers.cookie ?? "" }));
		if (!session) return { ok: false, status: 401, reason: "no session" };
		const access = await roomAccess(db, session.user.id, code);
		if (!access.ok) {
			const status = access.reason === "notFound" ? 404 : access.reason === "cancelled" ? 410 : 403;
			return { ok: false, status, reason: access.reason };
		}
		const user = await roomUser(db, session.user.id);
		if (!user) return { ok: false, status: 403, reason: "no user" };
		const type = ROOM_TYPES.find((t) => t.id === access.room.roomType);
		return {
			ok: true,
			endDate: access.room.endDate,
			user,
			timer: {
				startDate: access.room.startDate.getTime(),
				durationMinutes: access.room.durationMinutes,
				firstLang: type?.to ?? "en",
			},
		};
	},
});

// 時間到的通知（要開始了 / 結束了）：每分鐘掃一次 Rooms。搬 Workers 時換 Cron Trigger
const stopReminders = startReminders(db, {
	log: (m) => logInfo("reminders", m),
	onError: (error, context) => logError("reminders", error, context),
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		stopReminders();
		live.closeAll();
		whiteboard.closeAll();
		server.close();
		process.exit(0);
	});
}
