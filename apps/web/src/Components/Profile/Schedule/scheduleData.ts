import type { ScheduleItem, ScheduleKind } from "@/schedule/client";
import type { LangCode } from "../profileData";
import { dayOffsetFrom, toISODate } from "./week";

/** 兩種卡：hosted = 我開的房、session = 我加入的房。「開放時段」2026-09-22 拿掉了（房主制下沒有它的角色） */
export type SlotKind = ScheduleKind;

export type Slot = {
	/** 房號：React key，之後也是進房的網址 */
	code: string;
	/**
	 * 當地日期 "YYYY-MM-DD"。
	 *
	 * ⚠️ 不用「週內第幾天」的相對索引：資料是一次抓一個範圍回來的（切週不重打 API），
	 *    相對索引跨不了週 —— 三週的資料混在一起會分不出哪筆屬於哪週。
	 *    要畫格子時再用 dayOffsetFrom() 換算成欄位。
	 */
	date: string;
	/** 從當地午夜起算的分鐘數 */
	startMinutes: number;
	endMinutes: number;
	kind: SlotKind;
	/** 開房可以不填，空字串；畫的時候用字典的 untitled */
	title: string;
	from: LangCode;
	to: LangCode;
	seats: { taken: number; total: number };
};

/**
 * 一格 10 分鐘，一天 144 格。
 *
 * 原本是 30 分鐘一格，但房間只有 20 / 40 / 60 分鐘，30 的格線畫不出 20 與 40；
 * 10 是三者的公因數，:00 / :30 的開始時間也都落在格線上。全天都能放，超出可視範圍的靠捲動。
 */
export const SLOT_MINUTES = 10;
export const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES;
/**
 * 一格（10 分鐘）的高度。20 分鐘的房 = 24px 只放得下標題一行，40 = 48px 加時間，
 * 60 = 72px 才有語言列 —— SlotCard 依長度決定畫幾行。一天 1728px。
 */
export const SLOT_HEIGHT = 12;
const MINUTES_PER_DAY = 24 * 60;

/** API 的 ScheduleItem（UTC ISO）→ 網格要的當地日期 + 分鐘。Date 的 getHours 就是瀏覽器時區 */
export function toSlot(item: ScheduleItem): Slot {
	const start = new Date(item.startDate);
	const end = new Date(item.endDate);
	const date = toISODate(start);
	// 跨我當地午夜的房（例如美國人開的、換算過來 23:30 開始）裁在當天底，下一欄不畫 —— 一天一欄畫不出跨欄。
	// 房最長 60 分鐘，最多少畫半小時。
	const crossesMidnight = toISODate(end) !== date;
	return {
		code: item.code,
		date,
		startMinutes: start.getHours() * 60 + start.getMinutes(),
		endMinutes: crossesMidnight ? MINUTES_PER_DAY : end.getHours() * 60 + end.getMinutes(),
		kind: item.kind,
		title: item.title,
		from: item.from,
		to: item.to,
		seats: item.seats,
	};
}

/** 挑出落在該週的時段，並附上欄位索引。切週時走這裡，不重新取資料。 */
export function slotsInWeek(slots: readonly Slot[], weekStart: string) {
	return slots
		.map((slot) => ({ slot, day: dayOffsetFrom(weekStart, slot.date) }))
		.filter((x) => x.day >= 0);
}

/**
 * 初始捲動位置：第一個時段再往前一小時，讓它不要緊貼著頂端；這週沒東西就停在早上 8 點。
 * 全天 144 格展開有 1728px，不捲的話打開只會看到一片空的凌晨。
 */
export function initialScrollTop(slots: readonly { startMinutes: number }[]): number {
	const earliest = slots.length ? Math.min(...slots.map((s) => s.startMinutes)) - 60 : 8 * 60;
	return (Math.max(0, earliest) / SLOT_MINUTES) * SLOT_HEIGHT;
}
