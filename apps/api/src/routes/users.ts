import { eq, ne } from "drizzle-orm";
import { Hono } from "hono";
import { requireUser, type Auth } from "@monstertalk/auth";
import { schema, type Db } from "@monstertalk/db";
import { notify } from "../notify.ts";

/** 別人的公開資料 —— 沒有 email、性別、興趣（那些是自己設定頁才看得到的） */
export type PublicUser = {
	id: string;
	name: string;
	avatar: string;
	nativeLang: string;
	learningLang: string;
	learningLevel: string;
	bio: string;
	lastSeenDate: string | null;
};

/** 名單一次最多這麼多；超過再做 server 端篩選與分頁（現在 11 個人，篩選在 client） */
const LIMIT = 50;

/**
 *   GET  /api/users            除了自己以外的人。線上狀態不在這裡（那是 /api/presence 的事，變動頻率差幾百倍）
 *   POST /api/users/:id/greet  打聲招呼：給對方一則通知，204。連點會寫多列，鈴鐺那邊 text 去重
 */
export function usersRoutes(auth: Auth, db: Db) {
	const app = new Hono();
	const guard = requireUser(auth);

	app.post("/users/:id/greet", guard, async (c) => {
		const target = c.req.param("id");
		if (target === c.var.user.id) return c.json({ error: "self" }, 409);
		const [user] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, target)).limit(1);
		if (!user) return c.json({ error: "notFound" }, 404);
		await notify(db, target, "greeting", { actor: c.var.user });
		return c.body(null, 204);
	});

	app.get("/users", guard, async (c) => {
		const rows = await db
			.select({
				id: schema.users.id,
				name: schema.users.name,
				avatar: schema.avatars.code,
				nativeLang: schema.users.nativeLang,
				learningLang: schema.users.learningLang,
				learningLevel: schema.users.learningLevel,
				bio: schema.users.bio,
				lastSeenDate: schema.users.lastSeenDate,
			})
			.from(schema.users)
			.innerJoin(schema.avatars, eq(schema.users.avatarId, schema.avatars.id))
			.where(ne(schema.users.id, c.var.user.id))
			.orderBy(schema.users.createDate)
			.limit(LIMIT);

		const users: PublicUser[] = rows.map((r) => ({ ...r, lastSeenDate: r.lastSeenDate?.toISOString() ?? null }));
		return c.json(users);
	});

	return app;
}
