import { eq, ne } from "drizzle-orm";
import { Hono } from "hono";
import { requireUser, type Auth } from "@monstertalk/auth";
import { schema, type Db } from "@monstertalk/db";

/** 別人的公開資料 —— 沒有 email、性別、興趣（那些是自己設定頁才看得到的） */
export type PublicUser = {
	id: string;
	name: string;
	avatar: string;
	nativeLang: string;
	learningLang: string;
	learningLevel: string;
	bio: string;
	lastSeenAt: string | null;
};

/** 名單一次最多這麼多；超過再做 server 端篩選與分頁（現在 11 個人，篩選在 client） */
const LIMIT = 50;

/**
 * GET /api/users：除了自己以外的人。線上狀態不在這裡（那是 /api/presence 的事，變動頻率差幾百倍）。
 */
export function usersRoutes(auth: Auth, db: Db) {
	const app = new Hono();

	app.get("/users", requireUser(auth), async (c) => {
		const rows = await db
			.select({
				id: schema.users.id,
				name: schema.users.name,
				avatar: schema.avatars.code,
				nativeLang: schema.users.nativeLang,
				learningLang: schema.users.learningLang,
				learningLevel: schema.users.learningLevel,
				bio: schema.users.bio,
				lastSeenAt: schema.users.lastSeenAt,
			})
			.from(schema.users)
			.innerJoin(schema.avatars, eq(schema.users.avatarId, schema.avatars.id))
			.where(ne(schema.users.id, c.var.user.id))
			.orderBy(schema.users.createdAt)
			.limit(LIMIT);

		const users: PublicUser[] = rows.map((r) => ({ ...r, lastSeenAt: r.lastSeenAt?.toISOString() ?? null }));
		return c.json(users);
	});

	return app;
}
