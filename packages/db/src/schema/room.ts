import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, smallint, text, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./auth.ts";

/**
 * 房間：主單 / 子單（使用者 2026-09-22 定的結構，見 .claude/memory/data-model-decisions.md）。
 *
 * ## 主單 Rooms
 *
 * **建後不可改**（vault room-booking-model：時段與人數上限開房當下即固定，要改只能取消重開）。
 * 所以 `durationMinutes` 與 `endDate` 冗餘沒有漂移風險：duration 是房主選的輸入（20 / 40 / 60），
 * endDate 由 server 在 insert 時算一次存起來，給範圍查詢與重疊檢查用；房內計時器直接讀 duration。
 *
 * 「額滿」與「已結束」不存：前者由子單 `count(approved) < capacity` 推、後者由 `endDate < now()` 推。
 * 取消存 `cancelDate`（null = 未取消），不做 status enum。
 *
 * `code` 是對外的房號（網址 /room/[code]、分享用），流水號 id 不外露。server 產生、撞到重試。
 * `roomType` 存 enum id（使用者要求），對應表在下面的 ROOM_TYPES；只有兩個值，不建 lookup 表。
 *
 * ## 子單 RoomMembers
 *
 * 房主自己也是一列（role host、status approved，開房同一交易插入），所以「我的房」= where userId = me，
 * 名額計算也統一。`unique (roomId, userId)`：退出再申請走狀態轉換 left → requested，不開新列。
 *
 * 跨表規則（同一人的房時間不重疊、名額檢查）放 api 的交易裡，不做 DB 層的 exclusion constraint。
 */
export const rooms = pgTable(
	"Rooms",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		code: text("code").notNull().unique(),
		hostId: text("hostId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		title: text("title").notNull().default(""),
		startDate: timestamp("startDate", { withTimezone: true }).notNull(),
		/** = startDate + durationMinutes，server 算好存 */
		endDate: timestamp("endDate", { withTimezone: true }).notNull(),
		durationMinutes: smallint("durationMinutes").notNull(),
		/** 含房主，2–4（vault：最多 4 人含房主） */
		capacity: smallint("capacity").notNull(),
		/** ROOM_TYPES 的 id */
		roomType: smallint("roomType").notNull(),
		cancelDate: timestamp("cancelDate", { withTimezone: true }),
		createDate: timestamp("createDate", { withTimezone: true }).notNull().defaultNow(),
		updateDate: timestamp("updateDate", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		index("Rooms_hostId_idx").on(t.hostId),
		// 週曆的範圍查詢與 Find Monsters 的「接下來的房」都從 startDate 切
		index("Rooms_startDate_idx").on(t.startDate),
		check("Rooms_durationMinutes_check", sql`${t.durationMinutes} in (20, 40, 60)`),
		check("Rooms_capacity_check", sql`${t.capacity} between 2 and 4`),
	],
);

export const roomMembers = pgTable(
	"RoomMembers",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
		roomId: integer("roomId")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade" }),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: text("role").notNull(),
		status: text("status").notNull(),
		createDate: timestamp("createDate", { withTimezone: true }).notNull().defaultNow(),
		updateDate: timestamp("updateDate", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		unique("RoomMembers_roomId_userId_unique").on(t.roomId, t.userId),
		// 「我的房」一律從 userId 進來
		index("RoomMembers_userId_idx").on(t.userId),
	],
);

/** 開始時間至少要在幾分鐘之後（使用者 2026-09-22：16:49 不能開 17:00，只能開 17:30） */
export const ROOM_LEAD_MINUTES = 30;
/** 開房時可選的時長（分鐘）；房內計時器對半切成兩桶 */
export const ROOM_DURATIONS = [20, 40, 60] as const;
export const ROOM_CAPACITY_MIN = 2;
export const ROOM_CAPACITY_MAX = 4;
export const ROOM_TITLE_MAX = 40;

/**
 * 房間類型：DB 存 id，API 回傳時展開成 from / to 給前端畫徽章。
 * ⚠️ id 一旦用過就不能改義（DB 裡已經有列指著它），只能往後加。
 */
export const ROOM_TYPES = [
	{ id: 1, from: "en", to: "zh" },
	{ id: 2, from: "zh", to: "en" },
] as const;

export const ROOM_MEMBER_ROLES = ["host", "member"] as const;
/**
 * requested 申請中 → approved 房主同意（佔一席）/ rejected 拒絕（不佔席）；
 * left = approved 後自己退出，席次還回去。房主退出 = 取消房間（Rooms.cancelDate），不走這裡。
 */
export const ROOM_MEMBER_STATUSES = ["requested", "approved", "rejected", "left"] as const;

export type RoomDuration = (typeof ROOM_DURATIONS)[number];
export type RoomTypeId = (typeof ROOM_TYPES)[number]["id"];
export type RoomMemberRole = (typeof ROOM_MEMBER_ROLES)[number];
export type RoomMemberStatus = (typeof ROOM_MEMBER_STATUSES)[number];
