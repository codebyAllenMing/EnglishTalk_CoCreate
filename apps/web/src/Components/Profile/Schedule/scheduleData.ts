import type { LangCode } from "../profileData";
import raw from "./fakeSchedule.json";
import { currentWeekStart, todayIndexIn, toMinutes } from "./week";

export type SlotKind = "open" | "session" | "hosted" | "add";

export type Slot = {
	/** 週一起算的 0–6 */
	day: number;
	/** 從午夜起算的分鐘數 */
	startMinutes: number;
	endMinutes: number;
	kind: SlotKind;
	title?: string;
	from?: LangCode;
	to?: LangCode;
	seats?: { taken: number; total: number };
};

/** 一格 30 分鐘，一天 48 格。全天都能放時段，超出可視範圍的靠捲動。 */
export const SLOT_MINUTES = 30;
export const SLOTS_PER_DAY = (24 * 60) / SLOT_MINUTES;
/**
 * 一格（30 分鐘）的高度。Grid 的 row 高與初始捲動位置的換算都靠它。
 *
 * ⚠️ 34px 是**內容決定的下限**，不是照設計稿量的。設計稿的卡片高度其實是內容
 *    撐出來的、不等於時段長度（"12:00–2:00 PM" 那張畫了 80px，時間軸上 2 小時
 *    只有 72px；1 小時的 English practice 更畫成 110px）。真的按時間定位之後，
 *    最短的 session 只有 1 小時 = 2 格，得裝下標題 + 時間 + 語言列三行 ≈ 66px。
 *    低於 34 那三行就會被 overflow 裁掉。
 */
export const SLOT_HEIGHT = 34;

/**
 * ⚠️⚠️ 假資料 ⚠️⚠️
 *
 * 後端尚未建立，週曆的內容來自 fakeSchedule.json。
 * grep "FAKE_" 可找出專案所有假內容。
 *
 * 存成 JSON 而不是 TS 常數，是為了對設計稿時好改：時間寫 "16:00" 這種人看得懂的
 * 字串，不是 960 這種要心算的分鐘數。轉換在這裡做一次，元件拿到的已經是分鐘數。
 */
const SLOTS: Slot[] = raw.slots.map((s) => ({
	day: s.day,
	startMinutes: toMinutes(s.start),
	endMinutes: toMinutes(s.end),
	kind: s.kind as SlotKind,
	title: "title" in s ? s.title : undefined,
	from: "from" in s ? (s.from as LangCode) : undefined,
	to: "to" in s ? (s.to as LangCode) : undefined,
	seats: "seats" in s ? s.seats : undefined,
}));

/**
 * 做成函式而不是常數：module 層級的常數只會在模組首次載入時算一次，
 * dev server 跑一整天之後「本週」就不動了。每次 render 呼叫才會跟著日期走。
 *
 * ⚠️ 靜態匯出時這仍然是**建置期**執行的，所以線上的「本週」會停在部署那一天，
 *    直到下次部署。那是靜態站的本質限制，不是這裡的 bug —— 真要即時，
 *    得等接上 API（屆時週的起訖本來就由 API 或使用者選擇決定）。
 *
 * 元件那端維持收 props，換成真資料時只要改這個函式的內容。
 */
export function getFakeSchedule() {
	const weekStart = currentWeekStart();
	return { weekStart, todayIndex: todayIndexIn(weekStart), slots: SLOTS };
}

/**
 * 初始捲動位置：第一個時段再往前一小時，讓它不要緊貼著頂端。
 * 全天 48 格展開有 1344px，不捲的話打開只會看到一片空的凌晨。
 */
export function initialScrollTop(slots: readonly Slot[]): number {
	if (!slots.length) return 0;
	const earliest = Math.min(...slots.map((s) => s.startMinutes));
	const target = Math.max(0, earliest - 60);
	return (target / SLOT_MINUTES) * SLOT_HEIGHT;
}
