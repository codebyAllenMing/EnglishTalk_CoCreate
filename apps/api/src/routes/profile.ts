import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireUser, type Auth } from "@monstertalk/auth";
import { schema, type Db } from "@monstertalk/db";
import {
	BIO_MAX,
	COUNTRIES,
	GENDERS,
	INTEREST_MAX,
	INTERESTS_MAX,
	LANGS,
	LEVELS,
	NAME_MAX,
	type Country,
	type Gender,
	type Lang,
	type Level,
} from "@monstertalk/db/schema";

/** 對外的個人資料形狀。avatar 給 code 不給 id —— 前端拿 code 對圖，數字對它沒意義 */
export type Profile = {
	name: string;
	email: string;
	avatar: string;
	nativeLang: Lang;
	nativeLevel: Level;
	learningLang: Lang;
	learningLevel: Level;
	country: Country;
	gender: Gender;
	interests: string[];
	bio: string;
};

/** PUT 的 body：Profile 去掉 email（改 email 是 auth 的事，不走這裡） */
export type ProfileInput = Omit<Profile, "email">;

/**
 * /api/me/profile 與 /api/avatars。
 *
 * better-auth 不認識個人資料欄位（見 packages/db 的 users），這裡用 Drizzle 直接讀寫 Users。
 * ⚠️ 改了 name 之後 better-auth 的 cookie 快取（5 分鐘）裡的 name 仍是舊的 ——
 *    前端存完要打 get-session?disableCookieCache=true 讓它重讀一次。
 */
export function profileRoutes(auth: Auth, db: Db) {
	const app = new Hono();
	const guard = requireUser(auth);

	app.get("/avatars", async (c) => {
		const rows = await db.select().from(schema.avatars).orderBy(schema.avatars.id);
		return c.json(rows.map(({ code, name }) => ({ code, name })));
	});

	app.get("/me/profile", guard, async (c) => {
		const profile = await readProfile(db, c.var.user.id);
		return profile ? c.json(profile) : c.json({ error: "notFound" }, 404);
	});

	app.put("/me/profile", guard, async (c) => {
		const body: unknown = await c.req.json().catch(() => null);
		const parsed = parseProfileInput(body);
		if (!parsed.ok) return c.json({ error: "invalid", field: parsed.field }, 400);

		const avatar = await db.select({ id: schema.avatars.id }).from(schema.avatars).where(eq(schema.avatars.code, parsed.value.avatar));
		if (!avatar[0]) return c.json({ error: "invalid", field: "avatar" }, 400);

		const { avatar: _code, ...fields } = parsed.value;
		await db
			.update(schema.users)
			.set({ ...fields, avatarId: avatar[0].id, updateDate: new Date() })
			.where(eq(schema.users.id, c.var.user.id));

		const profile = await readProfile(db, c.var.user.id);
		return c.json(profile);
	});

	return app;
}

async function readProfile(db: Db, userId: string): Promise<Profile | null> {
	const rows = await db
		.select({
			name: schema.users.name,
			email: schema.users.email,
			avatar: schema.avatars.code,
			nativeLang: schema.users.nativeLang,
			nativeLevel: schema.users.nativeLevel,
			learningLang: schema.users.learningLang,
			learningLevel: schema.users.learningLevel,
			country: schema.users.country,
			gender: schema.users.gender,
			interests: schema.users.interests,
			bio: schema.users.bio,
		})
		.from(schema.users)
		.innerJoin(schema.avatars, eq(schema.users.avatarId, schema.avatars.id))
		.where(eq(schema.users.id, userId));
	const row = rows[0];
	if (!row) return null;
	// 列舉欄位在 DB 是 text，寫入時已驗過，讀出來直接標型別
	return row as Profile;
}

type Parsed = { ok: true; value: ProfileInput } | { ok: false; field: string };

/**
 * 手寫驗證，不裝 schema 套件 —— 九個欄位、四組列舉，一個函式就講完。
 * 回第一個錯的欄位名，前端自己對訊息。
 */
function parseProfileInput(body: unknown): Parsed {
	if (typeof body !== "object" || body === null) return { ok: false, field: "body" };
	const b = body as Record<string, unknown>;

	const str = (key: string, max: number, min = 0): string | null => {
		const v = b[key];
		if (typeof v !== "string") return null;
		const t = v.trim();
		return t.length < min || t.length > max ? null : t;
	};
	const oneOf = <T extends string>(key: string, allowed: readonly T[]): T | null => {
		const v = b[key];
		return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
	};

	const name = str("name", NAME_MAX, 1);
	if (name === null) return { ok: false, field: "name" };
	const avatar = str("avatar", 40, 1);
	if (avatar === null) return { ok: false, field: "avatar" };
	const nativeLang = oneOf("nativeLang", LANGS);
	if (!nativeLang) return { ok: false, field: "nativeLang" };
	const learningLang = oneOf("learningLang", LANGS);
	if (!learningLang || learningLang === nativeLang) return { ok: false, field: "learningLang" };
	const nativeLevel = oneOf("nativeLevel", LEVELS);
	if (!nativeLevel) return { ok: false, field: "nativeLevel" };
	const learningLevel = oneOf("learningLevel", LEVELS);
	if (!learningLevel) return { ok: false, field: "learningLevel" };
	const country = oneOf("country", COUNTRIES);
	if (!country) return { ok: false, field: "country" };
	const gender = oneOf("gender", GENDERS);
	if (!gender) return { ok: false, field: "gender" };
	const bio = str("bio", BIO_MAX);
	if (bio === null) return { ok: false, field: "bio" };

	const rawInterests = b.interests;
	if (!Array.isArray(rawInterests) || rawInterests.length > INTERESTS_MAX) return { ok: false, field: "interests" };
	const interests: string[] = [];
	for (const item of rawInterests) {
		if (typeof item !== "string") return { ok: false, field: "interests" };
		const t = item.trim();
		if (!t || t.length > INTEREST_MAX) return { ok: false, field: "interests" };
		// 大小寫不同的重複視為同一個，留第一個
		if (!interests.some((i) => i.toLowerCase() === t.toLowerCase())) interests.push(t);
	}

	return {
		ok: true,
		value: { name, avatar, nativeLang, nativeLevel, learningLang, learningLevel, country, gender, interests, bio },
	};
}
