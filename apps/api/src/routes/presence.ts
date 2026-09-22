import { Hono } from "hono";
import { requireUser, type Auth } from "@monstertalk/auth";
import type { PresenceStore } from "../presence/store.ts";

/**
 * 心跳與查詢。
 *
 *   POST /api/me/presence { state: "active" | "idle" }   前端每 60 秒一次，狀態一變立刻一次
 *   POST /api/me/presence/leave                          登出前、關分頁（sendBeacon，沒有 body）
 *   GET  /api/presence                                   { [userId]: "active" | "idle" }，只列還活著的
 *
 * 誰在打由 cookie 決定（requireUser），前端不用帶任何識別。
 */
export function presenceRoutes(auth: Auth, presence: PresenceStore) {
	const app = new Hono();
	const guard = requireUser(auth);

	app.post("/me/presence", guard, async (c) => {
		const body: unknown = await c.req.json().catch(() => null);
		const state = typeof body === "object" && body !== null && "state" in body ? body.state : undefined;
		if (state !== "active" && state !== "idle") return c.json({ error: "invalid", field: "state" }, 400);
		presence.heartbeat(c.var.session.id, c.var.user.id, state);
		return c.body(null, 204);
	});

	app.post("/me/presence/leave", guard, (c) => {
		presence.leave(c.var.session.id);
		return c.body(null, 204);
	});

	app.get("/presence", guard, (c) => c.json(presence.snapshot()));

	return app;
}
