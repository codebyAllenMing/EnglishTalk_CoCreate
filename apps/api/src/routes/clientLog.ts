import { Hono } from "hono";
import { requireUser, type Auth } from "@monstertalk/auth";
import { logError } from "../log.ts";

const SCOPE_MAX = 40;
const MESSAGE_MAX = 500;
const CONTEXT_MAX = 2000;

/**
 * POST /api/client-log：前端把抓到的例外丟過來，跟 server 的 log 排在同一個地方。
 * 手機在別的網路上視訊接不上，看 api 的 terminal 就知道是哪一步（使用者 2026-09-22 要求可追蹤）。
 * 只收登入的人、欄位長度有上限、context 只留字串化後的一小段，不當成 log 系統用。
 */
export function clientLogRoutes(auth: Auth) {
	const app = new Hono();
	app.post("/client-log", requireUser(auth), async (c) => {
		const body: unknown = await c.req.json().catch(() => null);
		if (typeof body !== "object" || body === null) return c.json({ error: "invalid", field: "body" }, 400);
		const b = body as { scope?: unknown; message?: unknown; context?: unknown };
		const scope = typeof b.scope === "string" && b.scope ? b.scope.slice(0, SCOPE_MAX) : null;
		const message = typeof b.message === "string" ? b.message.slice(0, MESSAGE_MAX) : null;
		if (!scope || message === null) return c.json({ error: "invalid", field: "scope" }, 400);
		const context = typeof b.context === "object" && b.context !== null ? JSON.stringify(b.context).slice(0, CONTEXT_MAX) : undefined;
		logError(`client.${scope}`, message, {
			userId: c.var.user.id,
			userAgent: c.req.header("user-agent"),
			context,
		});
		return c.body(null, 204);
	});
	return app;
}
