import { pgTable, smallint, text } from "drizzle-orm/pg-core";

/**
 * 個人資料的列舉值。前端在 `apps/web` 從字典的 key 推導同一份（LangCode / LevelCode…），
 * 這裡是後端驗證用的複本 —— 兩邊都只有幾個值，改動時兩邊一起改。
 */
export const LANGS = ["zh", "en"] as const;
export const LEVELS = ["beginner", "intermediate", "advanced", "fluent"] as const;
export const GENDERS = ["male", "female", "nonBinary", "preferNot"] as const;
/** 只有兩個（使用者 2026-09-21：「只會有兩個國家」） */
export const COUNTRIES = ["TW", "US"] as const;

export const NAME_MAX = 20;
export const BIO_MAX = 150;
export const INTEREST_MAX = 20;
export const INTERESTS_MAX = 10;

export type Lang = (typeof LANGS)[number];
export type Level = (typeof LEVELS)[number];
export type Gender = (typeof GENDERS)[number];
export type Country = (typeof COUNTRIES)[number];

/**
 * 頭像目錄（lookup table）。DB 存數字 id，前端拿 code 對 public/images/avatar-<code>.webp。
 * 11 隻由 migration 塞進去（prod 也要有，不能靠 dev 的 seed）；
 * 之後「用代幣解鎖」的擁有權表 UserAvatars 直接 FK 到這裡。
 */
export const avatars = pgTable("Avatars", {
	id: smallint("id").primaryKey(),
	code: text("code").notNull().unique(),
	name: text("name").notNull(),
});

/** migration 與 seed 共用的目錄內容；順序就是 id（1 起算） */
export const AVATAR_CATALOG = [
	"allen",
	"luna",
	"bobby",
	"alex",
	"mia",
	"sunny",
	"tao",
	"yuki",
	"ryan",
	"nina",
	"leo",
] as const;
