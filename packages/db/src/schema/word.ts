import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, smallint, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./auth.ts";
import { rooms } from "./room.ts";

/**
 * 單字庫（使用者 2026-09-22 定案，見 .claude/memory/data-model-decisions.md）。
 *
 * 一列 = 某人從聊天存下來的一個字。`example` 是存字那一刻抄下來的聊天原句 ——
 * 聊天歷史不進 DB，所以原句一定要在這裡自己留一份。
 *
 * - `roomId` 只拿來篩「這場存的字」（房間面板）；nullable + set null 是因為 seed 清房會物理刪 Rooms，字要留下來。
 * - `pos` 是詞性的 enum id（跟 Rooms.roomType 同做法：DB 存數字、對照表在程式碼），見 WORD_POS。
 * - `isDelete` 軟刪：所有讀取都要加 `isDelete = false`；DELETE API 只翻這個旗標。
 * - **同一個字存過要擋**（整本字典、跨房間）：partial unique index `(userId, lang, lower(word)) where isDelete = false`，
 *   Apple / apple 算同一個字；刪掉的字再存是新的一列，舊列留著。
 */
export const words = pgTable(
	"Words",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		roomId: integer("roomId").references(() => rooms.id, { onDelete: "set null" }),
		word: text("word").notNull(),
		pos: smallint("pos").notNull(),
		meaning: text("meaning").notNull().default(""),
		example: text("example").notNull().default(""),
		lang: text("lang").notNull(),
		isDelete: boolean("isDelete").notNull().default(false),
		createDate: timestamp("createDate", { withTimezone: true }).notNull().defaultNow(),
		updateDate: timestamp("updateDate", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		// home 的整本字典：某人的字照存的時間排
		index("Words_userId_createDate_idx").on(t.userId, t.createDate),
		// 房間面板：這場存的字
		index("Words_roomId_idx").on(t.roomId),
		uniqueIndex("Words_userId_lang_word_unique")
			.on(t.userId, t.lang, sql`lower(${t.word})`)
			.where(sql`${t.isDelete} = false`),
		check("Words_pos_check", sql`${t.pos} between 1 and 7`),
		check("Words_lang_check", sql`${t.lang} in ('zh', 'en')`),
	],
);

/** 詞性 enum。DB 存 id；前端拿 code 對字典文案（`room.saveWord.posOptions.<code>`）。成語獨立一項是使用者留這欄的理由 */
export const WORD_POS = [
	{ id: 1, code: "noun" },
	{ id: 2, code: "verb" },
	{ id: 3, code: "adjective" },
	{ id: 4, code: "adverb" },
	{ id: 5, code: "phrase" },
	{ id: 6, code: "idiom" },
	{ id: 7, code: "other" },
] as const;

export type WordPosId = (typeof WORD_POS)[number]["id"];
export type WordPosCode = (typeof WORD_POS)[number]["code"];

export const WORD_MAX = 60;
export const WORD_MEANING_MAX = 200;
/** = 聊天單則上限（packages/live 的 textLimit） */
export const WORD_EXAMPLE_MAX = 500;

/** 這條 unique index 撞到 = 已存過（API 回 409 duplicate） */
export const WORDS_UNIQUE_INDEX = "Words_userId_lang_word_unique";
