import { createMiddleware } from "hono/factory";
import type { Auth, Session, User } from "./auth.ts";

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
 *
 * ⚠️ 用 `returnHeaders: true` 把 better-auth 想重發的 Set-Cookie 轉回 response。
 *    session 是滑動續期（7 天，超過 updateAge 就延長），cookie 快取（5 分鐘）過期也會重簽 ——
 *    這些都靠 Set-Cookie 送回瀏覽器；少了這段，走我們自己路由的續期只更新 DB、瀏覽器那顆 cookie 的期限沒動。
 */
export function requireUser(auth: Auth) {
	return createMiddleware<AuthEnv>(async (c, next) => {
		const { headers, response } = await auth.api.getSession({ headers: c.req.raw.headers, returnHeaders: true });
		if (!response) {
			return c.json({ error: "unauthorized" }, 401);
		}
		for (const cookie of headers.getSetCookie()) {
			c.header("Set-Cookie", cookie, { append: true });
		}
		c.set("user", response.user);
		c.set("session", response.session);
		await next();
	});
}
