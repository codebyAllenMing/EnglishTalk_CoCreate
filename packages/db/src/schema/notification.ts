import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, smallint, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth.ts";

/**
 * 通知（使用者 2026-09-23 定案）。
 *
 * **只寫不刪、只是訊息**：一列 = 給某人的一句話，`text` 是寫入那一刻在 server 依收件人母語組好的成品，
 * DB 不存參照（哪間房、誰做的），點了也不跳頁。可以重複寫（排程每分鐘掃，同一件事可能寫兩次），
 * **讀的時候用 `text` 去重**，所以模板裡不能放秒數、流水號這種每次都不一樣的東西。
 *
 * - `type` 是 NOTIFICATION_TYPES 的 id（跟 roomType / pos 同做法），只拿來畫圖示與分類，文案不靠它。
 * - `isRead` 唯一會變的欄：打開鈴鐺那一刻整批翻 true，不會翻回來。
 * - 寫入點全在 server：房間路由的交易裡、api 的排程、better-auth 的 user.create hook、打招呼端點。前端只讀。
 */
export const notifications = pgTable(
	"Notifications",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		/** 收件人 */
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: smallint("type").notNull(),
		text: text("text").notNull(),
		isRead: boolean("isRead").notNull().default(false),
		createDate: timestamp("createDate", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		// 鈴鐺清單：某人的通知照時間倒排
		index("Notifications_userId_createDate_idx").on(t.userId, t.createDate),
		// 徽章數：只掃未讀的那幾列
		index("Notifications_userId_unread_idx").on(t.userId).where(sql`${t.isRead} = false`),
		check("Notifications_type_check", sql`${t.type} between 1 and 10`),
	],
);

/**
 * 通知類型。DB 存 id；API 回 code、前端拿 code 決定圖示。
 * ⚠️ id 一旦用過就不能改義（DB 裡已經有列指著它），只能往後加。
 */
export const NOTIFICATION_TYPES = [
	{ id: 1, code: "roomCreated" }, // 給房主自己：你開了 X，幾點開始
	{ id: 2, code: "roomStarting" }, // 給 approved 成員含房主：X 5 分鐘後開始（排程）
	{ id: 3, code: "joinRequested" }, // 給房主：actor 申請加入 X
	{ id: 4, code: "joinApproved" }, // 給申請者：actor 同意你加入 X
	{ id: 5, code: "joinRejected" }, // 給申請者：actor 婉拒了你加入 X
	{ id: 6, code: "roomCancelled" }, // 給 approved 成員：actor 取消了 X
	{ id: 7, code: "memberLeft" }, // 給房主：actor 退出了 X
	{ id: 8, code: "roomEnded" }, // 給 approved 成員含房主：X 結束了（排程）
	{ id: 9, code: "greeting" }, // 給被招呼的人：actor 跟你打了聲招呼
	{ id: 10, code: "welcome" }, // 給新註冊者
] as const;

export type NotificationTypeId = (typeof NOTIFICATION_TYPES)[number]["id"];
export type NotificationTypeCode = (typeof NOTIFICATION_TYPES)[number]["code"];

export function notificationTypeId(code: NotificationTypeCode): NotificationTypeId {
	const found = NOTIFICATION_TYPES.find((t) => t.code === code);
	if (!found) throw new Error(`unknown notification type ${code}`);
	return found.id;
}

export function notificationTypeCode(id: number): NotificationTypeCode {
	return NOTIFICATION_TYPES.find((t) => t.id === id)?.code ?? "welcome";
}
