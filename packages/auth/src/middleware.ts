import { createMiddleware } from "hono/factory";
import { verifySession, type Auth, type Session, type User } from "./auth.ts";

/** 掛了 requireUser 之後 c.var.user / c.var.session 的型別 */
export type AuthEnv = {
	Variables: {
		user: User;
		session: Session;
	};
};

/**
 * Hono middleware：沒有有效 session 直接 401，有的話把 user / session 放進 context。
 *
 *   app.get("/api/me", requireUser(auth), (c) => c.json(c.var.user));
 *
 * 對照 ASP.NET 的 [Authorize] + HttpContext.User。
 */
export function requireUser(auth: Auth) {
	return createMiddleware<AuthEnv>(async (c, next) => {
		const data = await verifySession(auth, c.req.raw.headers);
		if (!data) {
			return c.json({ error: "unauthorized" }, 401);
		}
		c.set("user", data.user);
		c.set("session", data.session);
		await next();
	});
}
