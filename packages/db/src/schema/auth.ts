import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * better-auth 的四張核心表。
 *
 * 命名照專案慣例：資料表 PascalCase 複數、欄位 camelCase ——
 * better-auth 預設欄位就是 camelCase，表名則在 packages/auth 用 modelName 對過去。
 * 欄位集合必須跟 better-auth 要的一致（多的可以、少的會在執行期炸），
 * 改動前先跑 `npx @better-auth/cli generate` 對照官方產出。
 *
 * ⚠️ 個人資料欄位（母語 / 學習語言 / 國家 / 頭像…）刻意還沒加 —— DB schema 另開一場討論。
 */
export const users = pgTable("Users", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("emailVerified").notNull().default(false),
	image: text("image"),
	createdAt: timestamp("createdAt").notNull().defaultNow(),
	updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const sessions = pgTable(
	"Sessions",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expiresAt").notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
		ipAddress: text("ipAddress"),
		userAgent: text("userAgent"),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
	},
	(t) => [index("Sessions_userId_idx").on(t.userId)],
);

/** 登入方式：帳密登入時 providerId = "credential"、password 存 hash；之後接 Google / LINE 各一列 */
export const accounts = pgTable(
	"Accounts",
	{
		id: text("id").primaryKey(),
		accountId: text("accountId").notNull(),
		providerId: text("providerId").notNull(),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accessToken: text("accessToken"),
		refreshToken: text("refreshToken"),
		idToken: text("idToken"),
		accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
		refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(t) => [index("Accounts_userId_idx").on(t.userId)],
);

/** 一次性 token（email 驗證、密碼重設）—— MVP 還沒用到，但 better-auth 啟動時就要這張表 */
export const verifications = pgTable(
	"Verifications",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expiresAt").notNull(),
		createdAt: timestamp("createdAt").notNull().defaultNow(),
		updatedAt: timestamp("updatedAt").notNull().defaultNow(),
	},
	(t) => [index("Verifications_identifier_idx").on(t.identifier)],
);
