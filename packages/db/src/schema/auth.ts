import { boolean, index, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";
import { avatars } from "./profile.ts";

/**
 * better-auth 的四張核心表。
 *
 * 命名照專案慣例：資料表 PascalCase 複數、欄位 camelCase、**時間欄位一律 `xxxDate`**
 * （createDate / updateDate / expireDate / lastSeenDate），不用 better-auth 預設的 `xxxAt`。
 * 表名與欄位名都在 packages/auth 用 modelName / fields 對回 better-auth 的名字（2026-09-22 改的，
 * 使用者的慣例是 createDate / updateDate，當初照 better-auth 預設吃是疏漏）。
 * 欄位集合必須跟 better-auth 要的一致（多的可以、少的會在執行期炸），
 * 改動前先跑 `npx @better-auth/cli generate` 對照官方產出。
 *
 * ## 個人資料直接放在 Users（使用者 2026-09-22 決定）
 *
 * Users = 這個人是誰；Accounts / Sessions = 他怎麼登入。better-auth 只認識它自己的那幾欄，
 * 個人資料欄位它不讀不寫，由 api 的 /api/me/profile 用 Drizzle 直接操作 ——
 * 註冊時 better-auth 只 insert 它知道的欄位，其餘吃 DB 的 default，所以每一欄都要有 default。
 * 列舉值不用 pg enum（改一個值就要 ALTER TYPE），存 text、在 api 驗證。
 */
export const users = pgTable("Users", {
	id: text("id").primaryKey(),
	/** 顯示名稱（註冊時的 displayName） */
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("emailVerified").notNull().default(false),
	/** better-auth 給社群登入頭像 URL 用的；怪獸頭像走 avatarId，不放這裡 */
	image: text("image"),
	createDate: timestamp("createDate").notNull().defaultNow(),
	updateDate: timestamp("updateDate").notNull().defaultNow(),

	// ---- 個人資料 ----
	/** FK 到 Avatars 目錄，新帳號預設第一隻 */
	avatarId: smallint("avatarId")
		.notNull()
		.default(1)
		.references(() => avatars.id),
	nativeLang: text("nativeLang").notNull().default("zh"),
	nativeLevel: text("nativeLevel").notNull().default("fluent"),
	learningLang: text("learningLang").notNull().default("en"),
	learningLevel: text("learningLevel").notNull().default("beginner"),
	country: text("country").notNull().default("TW"),
	gender: text("gender").notNull().default("preferNot"),
	/** 自由字串（設定頁是自由輸入），最多 10 個、每個 20 字；已知的十二個興趣存的是使用者看到的文字 */
	interests: text("interests").array().notNull().default([]),
	bio: text("bio").notNull().default(""),
	/**
	 * 最後一次在線上的時間，給「最後上線 2 小時前」用。**不是**線上狀態 ——
	 * 線上狀態住在 api 的 presence cache（會過期的東西不進 DB），這欄只在某人變成離線時寫一次。
	 */
	lastSeenDate: timestamp("lastSeenDate", { withTimezone: true }),
});

export const sessions = pgTable(
	"Sessions",
	{
		id: text("id").primaryKey(),
		expireDate: timestamp("expireDate").notNull(),
		token: text("token").notNull().unique(),
		createDate: timestamp("createDate").notNull().defaultNow(),
		updateDate: timestamp("updateDate").notNull().defaultNow(),
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
		accessTokenExpireDate: timestamp("accessTokenExpireDate"),
		refreshTokenExpireDate: timestamp("refreshTokenExpireDate"),
		scope: text("scope"),
		password: text("password"),
		createDate: timestamp("createDate").notNull().defaultNow(),
		updateDate: timestamp("updateDate").notNull().defaultNow(),
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
		expireDate: timestamp("expireDate").notNull(),
		createDate: timestamp("createDate").notNull().defaultNow(),
		updateDate: timestamp("updateDate").notNull().defaultNow(),
	},
	(t) => [index("Verifications_identifier_idx").on(t.identifier)],
);
