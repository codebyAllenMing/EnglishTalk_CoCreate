import type { MemberStatus, OpenRoom, ScheduleItem } from "@/schedule/client";
import type { LangCode } from "../profileData";
import { dayOffsetFrom, toISODate } from "./week";

/** 網格要的位置：當地日期 + 分鐘畫格子，epoch 毫秒算重疊 */
export type Position = {
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
	/** epoch ms，重疊判斷用 */
	start: number;
	end: number;
};

/** 我有份的房：我開的（hosted）、我加入的或申請中的（session） */
export type MineSlot = Position & {
	kind: "hosted" | "session";
	status: MemberStatus;
	/** 房號：React key，之後也是進房的網址 */
	code: string;
	/** 開房可以不填，空字串；畫的時候用字典的 untitled */
	title: string;
	from: LangCode;
	to: LangCode;
	seats: { taken: number; total: number };
};

/**
 * 別人開的、可申請的房。同一時段重疊的幾間併成一張卡（週曆畫不出重疊），
 * 點開再挑。跟我自己的房撞時間的不會出現在這裡（openSlots 濾掉了）。
 */
export type OpenSlot = Position & {
	kind: "open";
	key: string;
	rooms: OpenRoom[];
};

export type Slot = MineSlot | OpenSlot;
export type SlotKind = Slot["kind"];

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
 * 60 = 72px 才有語言列 —— 卡片依長度決定畫幾行。一天 1728px。
 */
export const SLOT_HEIGHT = 12;
const MINUTES_PER_DAY = 24 * 60;

/** UTC ISO → 網格要的當地日期 + 分鐘。Date 的 getHours 就是瀏覽器時區 */
export function position(startIso: string, endIso: string): Position {
	const start = new Date(startIso);
	const end = new Date(endIso);
	const date = toISODate(start);
	// 跨我當地午夜的房（例如美國人開的、換算過來 23:30 開始）裁在當天底，下一欄不畫 —— 一天一欄畫不出跨欄。
	// 房最長 60 分鐘，最多少畫半小時。
	const crossesMidnight = toISODate(end) !== date;
	return {
		date,
		startMinutes: start.getHours() * 60 + start.getMinutes(),
		endMinutes: crossesMidnight ? MINUTES_PER_DAY : end.getHours() * 60 + end.getMinutes(),
		start: start.getTime(),
		end: end.getTime(),
	};
}

export function toSlot(item: ScheduleItem): MineSlot {
	return {
		...position(item.startDate, item.endDate),
		kind: item.kind,
		status: item.status,
		code: item.code,
		title: item.title,
		from: item.from,
		to: item.to,
		seats: item.seats,
	};
}

export const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) =>
	a.start < b.end && a.end > b.start;

/**
 * 別人的房 → 黃卡。跟我任何一張卡（含申請中的）撞時間的先濾掉：規則上加不了，網格也畫不出重疊。
 * 剩下的依開始時間排序，同一天、時間有交集的串成一張（交集是遞移的：A 撞 B、B 撞 C 就三間一張）。
 */
export function openSlots(rooms: readonly OpenRoom[], mine: readonly MineSlot[]): OpenSlot[] {
	const placed = rooms
		.map((room) => ({ room, pos: position(room.startDate, room.endDate) }))
		.filter(({ pos }) => !mine.some((m) => overlaps(m, pos)))
		.sort((a, b) => a.pos.start - b.pos.start);

	const clusters: OpenSlot[] = [];
	for (const { room, pos } of placed) {
		const last = clusters.at(-1);
		if (last && last.date === pos.date && pos.start < last.end) {
			last.rooms.push(room);
			last.end = Math.max(last.end, pos.end);
			last.endMinutes = Math.max(last.endMinutes, pos.endMinutes);
			last.key += `+${room.code}`;
		} else {
			clusters.push({ kind: "open", key: `open:${room.code}`, rooms: [room], ...pos });
		}
	}
	return clusters;
}

/** 挑出落在該週的時段，並附上欄位索引。切週時走這裡，不重新取資料。 */
export function slotsInWeek<T extends { date: string }>(slots: readonly T[], weekStart: string) {
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

/** 卡片在 grid 裡的位置。第一欄是時間軸、第一列是表頭，所以 +2 */
export function gridStyle(slot: Position, day: number) {
	const firstRow = Math.floor(slot.startMinutes / SLOT_MINUTES);
	const lastRow = Math.ceil(slot.endMinutes / SLOT_MINUTES);
	return { gridColumn: day + 2, gridRow: `${firstRow + 2} / span ${Math.max(1, lastRow - firstRow)}` };
}
