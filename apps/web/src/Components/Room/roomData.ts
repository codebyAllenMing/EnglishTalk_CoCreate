import type { Dictionary } from "@/dictionaries";
import type { LangCode } from "../Profile/profileData";
import raw from "./fakeRoom.json";

export type RoomKind = keyof Dictionary["room"]["kind"];
export type PosCode = keyof Dictionary["room"]["saveWord"]["posOptions"];

export type Participant = {
	/** 對應 avatar-${id}.webp */
	id: string;
	name: string;
	/** 這個人在房裡代表的語言（母語那一側），決定徽章與泡泡顏色 */
	lang: LangCode;
	me?: boolean;
};

export type ChatMessage = {
	id: string;
	from: string;
	/** "HH:MM" —— 跟週曆同一套，顯示時再轉語系格式 */
	at: string;
	text: string;
};

export type Topic = Record<LangCode, string>;

export type WordEntry = {
	id: string;
	word: string;
	pos: PosCode;
	meaning: string;
	/** 來源訊息的原句 —— 就是例句，不用另外要 */
	example: string;
	lang: LangCode;
};

export type Room = {
	code: string;
	kind: RoomKind;
	/** 本地時間，不帶時區 —— 跟週曆的 parseLocalDate 同一個約定 */
	startsAt: string;
	durationMinutes: number;
	participants: Participant[];
	messages: ChatMessage[];
	topics: Topic[];
	words: WordEntry[];
};

/**
 * ⚠️⚠️ 假資料 ⚠️⚠️
 *
 * 後端與即時通訊都還沒有，整個房間的初始狀態來自 fakeRoom.json。
 * grep "FAKE_" 可找出專案所有假內容。
 *
 * 房號寫死 HAPPY123 —— 靜態匯出的 /room/[code] 只能預先建出列在
 * generateStaticParams 的房號，其他房號要等有 SSR 的部署。
 */
export const FAKE_ROOM: Room = {
	...raw,
	kind: raw.kind as RoomKind,
	participants: raw.participants.map((p) => ({ ...p, lang: p.lang as LangCode })),
	words: raw.words.map((w) => ({ ...w, pos: w.pos as PosCode, lang: w.lang as LangCode })),
};

/** "2026-09-22T20:00" → Date（本地時間）。不用 new Date(iso)：那會被當 UTC */
export function parseLocalDateTime(value: string): Date {
	const [date, time] = value.split("T");
	const [y, m, d] = date.split("-").map(Number);
	const [hh, mm] = time.split(":").map(Number);
	return new Date(y, m - 1, d, hh, mm);
}

/** 秒 → "10:00" */
export function formatClock(seconds: number): string {
	const s = Math.max(0, seconds);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Date → "HH:MM"，給新送出的訊息用 */
export function toHHMM(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
