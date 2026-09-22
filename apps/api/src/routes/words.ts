import { and, asc, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireUser, type Auth } from "@monstertalk/auth";
import { schema, type Db } from "@monstertalk/db";
import {
	LANGS,
	WORD_EXAMPLE_MAX,
	WORD_MAX,
	WORD_MEANING_MAX,
	WORD_POS,
	WORDS_UNIQUE_INDEX,
	type Lang,
	type WordPosId,
} from "@monstertalk/db/schema";
import { roomAccess } from "../rooms/access.ts";

/** 對外的一個字。pos 給 enum id，前端自己對字典；roomId 不給（前端用不到） */
export type WordItem = {
	id: number;
	word: string;
	pos: WordPosId;
	meaning: string;
	example: string;
	lang: Lang;
	/** ISO */
	createDate: string;
};

/** POST /api/rooms/:code/words 的 body。roomId 從路徑來，不收 */
export type WordInput = {
	word: string;
	pos: WordPosId;
	meaning?: string;
	/** 來源訊息的原句 */
	example?: string;
	lang: Lang;
};

/**
 * 單字庫。範圍用路徑分（使用者 2026-09-22：「不要用 params 去區分」「我習慣用 router」）：
 *
 *   GET    /api/me/words             整本（home 的 Word Bank 頁，還沒做）
 *   DELETE /api/me/words/:id         軟刪（isDelete = true），房間面板與 home 頁共用
 *   GET    /api/rooms/:code/words    這場存的字（房間面板；重新整理回來還在）
 *   POST   /api/rooms/:code/words    存字。同一個字存過（整本、不分房、不分大小寫）回 409 { error: "duplicate" }
 *
 * 房間底下的兩條先過 roomAccess：不在這房、房沒開、房結束了都進不來，跟白板 / 聊天的握手同一道門。
 * 所有讀取都只拿 isDelete = false 的列。
 */
export function wordsRoutes(auth: Auth, db: Db) {
	const app = new Hono();
	const guard = requireUser(auth);

	app.get("/me/words", guard, async (c) => {
		const rows = await db
			.select()
			.from(schema.words)
			.where(and(eq(schema.words.userId, c.var.user.id), eq(schema.words.isDelete, false)))
			.orderBy(desc(schema.words.createDate), desc(schema.words.id));
		return c.json(rows.map(toItem));
	});

	app.delete("/me/words/:id", guard, async (c) => {
		const id = Number(c.req.param("id"));
		if (!Number.isInteger(id) || id <= 0) return c.json({ error: "invalid", field: "id" }, 400);
		const updated = await db
			.update(schema.words)
			.set({ isDelete: true, updateDate: new Date() })
			.where(and(eq(schema.words.id, id), eq(schema.words.userId, c.var.user.id), eq(schema.words.isDelete, false)))
			.returning({ id: schema.words.id });
		if (!updated.length) return c.json({ error: "notFound" }, 404);
		return c.body(null, 204);
	});

	app.get("/rooms/:code/words", guard, async (c) => {
		const access = await roomAccess(db, c.var.user.id, c.req.param("code"));
		if (!access.ok) return c.json({ error: access.reason }, accessStatus(access.reason));
		const rows = await db
			.select()
			.from(schema.words)
			.where(
				and(
					eq(schema.words.roomId, access.room.id),
					eq(schema.words.userId, c.var.user.id),
					eq(schema.words.isDelete, false),
				),
			)
			.orderBy(asc(schema.words.createDate), asc(schema.words.id));
		return c.json(rows.map(toItem));
	});

	app.post("/rooms/:code/words", guard, async (c) => {
		const access = await roomAccess(db, c.var.user.id, c.req.param("code"));
		if (!access.ok) return c.json({ error: access.reason }, accessStatus(access.reason));
		const body: unknown = await c.req.json().catch(() => null);
		const parsed = parseWordInput(body);
		if (!parsed.ok) return c.json({ error: "invalid", field: parsed.field }, 400);

		try {
			const inserted = await db
				.insert(schema.words)
				.values({ ...parsed.input, userId: c.var.user.id, roomId: access.room.id })
				.returning();
			const row = inserted[0];
			if (!row) throw new Error("insert Words 沒有回傳列");
			return c.json(toItem(row), 201);
		} catch (error) {
			if (isDuplicate(error)) return c.json({ error: "duplicate" }, 409);
			throw error;
		}
	});

	return app;
}

function accessStatus(reason: "notFound" | "cancelled" | "notMember" | "notStarted" | "ended") {
	return reason === "notFound" ? 404 : reason === "cancelled" ? 410 : 403;
}

function toItem(row: typeof schema.words.$inferSelect): WordItem {
	return {
		id: row.id,
		word: row.word,
		pos: row.pos as WordPosId,
		meaning: row.meaning,
		example: row.example,
		lang: row.lang as Lang,
		createDate: row.createDate.toISOString(),
	};
}

type Parsed = { ok: true; input: Required<WordInput> } | { ok: false; field: string };

/** 手寫驗證（跟 rooms.ts 同做法，不引 zod）。字串都 trim；meaning / example 可以不給 */
function parseWordInput(body: unknown): Parsed {
	if (typeof body !== "object" || body === null) return { ok: false, field: "body" };
	const b = body as Record<string, unknown>;

	const word = typeof b.word === "string" ? b.word.trim() : "";
	if (!word || word.length > WORD_MAX) return { ok: false, field: "word" };

	const pos = WORD_POS.find((p) => p.id === b.pos)?.id;
	if (pos === undefined) return { ok: false, field: "pos" };

	const meaning = optionalText(b.meaning, WORD_MEANING_MAX);
	if (meaning === null) return { ok: false, field: "meaning" };
	const example = optionalText(b.example, WORD_EXAMPLE_MAX);
	if (example === null) return { ok: false, field: "example" };

	const lang = (LANGS as readonly string[]).includes(String(b.lang)) ? (b.lang as Lang) : undefined;
	if (!lang) return { ok: false, field: "lang" };

	return { ok: true, input: { word, pos, meaning, example, lang } };
}

/** 沒給 = 空字串；給了就要是字串且不超長。超長回 null */
function optionalText(value: unknown, max: number): string | null {
	if (value === undefined || value === null) return "";
	if (typeof value !== "string") return null;
	const text = value.trim();
	return text.length > max ? null : text;
}

/**
 * 撞到「存過要擋」的 partial unique index。postgres-js 丟 PostgresError（code 23505 + constraint_name），
 * drizzle 0.45 再包一層 DrizzleQueryError 放在 cause，兩層都看。
 */
function isDuplicate(error: unknown): boolean {
	for (let e: unknown = error; typeof e === "object" && e !== null; e = (e as { cause?: unknown }).cause) {
		const pg = e as { code?: unknown; constraint_name?: unknown };
		if (pg.code === "23505") return pg.constraint_name === WORDS_UNIQUE_INDEX || pg.constraint_name === undefined;
	}
	return false;
}
