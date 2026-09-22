import { Server as HttpServer } from "node:http";
import { serve } from "@hono/node-server";
import { verifySession } from "@monstertalk/auth";
import { createWhiteboardHub } from "@monstertalk/whiteboard";
import { attachWhiteboardServer, type UpgradeDecision } from "@monstertalk/whiteboard/node";
import { createApp } from "./app.ts";
import { loadEnv } from "./env.ts";
import { roomAccess } from "./rooms/access.ts";

const env = loadEnv(process.env);
const { app, auth, db } = createApp(env);

const server = serve({ fetch: app.fetch, port: env.API_PORT }, (info) => {
	console.log(`api listening on http://localhost:${info.port}`);
});

/**
 * 白板的 WebSocket 掛在同一個 http server 上（路徑 /api/rooms/:code/whiteboard）。
 * 這裡是安全層：cookie 驗 session → roomAccess 查子單與時間窗，任何一關沒過握手就被拒，
 * 直接開 WS 的人在這裡被擋掉。頁面那層的判斷只是體驗。
 */
// serve() 的型別是 http / http2 / https 的聯集，實際上不給 createServer 就是 http.Server；upgrade 事件只在這型別上有
if (!(server instanceof HttpServer)) throw new Error("expected an http.Server for WebSocket upgrades");
const whiteboard = createWhiteboardHub({ log: (m) => console.log(m) });
attachWhiteboardServer(server, {
	hub: whiteboard,
	origin: env.WEB_ORIGIN,
	log: (m) => console.log(m),
	authorize: async (req, code): Promise<UpgradeDecision> => {
		const session = await verifySession(auth, new Headers({ cookie: req.headers.cookie ?? "" }));
		if (!session) return { ok: false, status: 401, reason: "no session" };
		const access = await roomAccess(db, session.user.id, code);
		if (access.ok) return { ok: true, endDate: access.room.endDate };
		const status = access.reason === "notFound" ? 404 : access.reason === "cancelled" ? 410 : 403;
		return { ok: false, status, reason: access.reason };
	},
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.on(signal, () => {
		whiteboard.closeAll();
		server.close();
		process.exit(0);
	});
}
