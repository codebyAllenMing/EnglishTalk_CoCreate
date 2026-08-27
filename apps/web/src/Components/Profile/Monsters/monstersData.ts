import type { LangCode, LevelCode } from "../profileData";
import raw from "./fakeMonsters.json";

export type Monster = {
	id: string;
	name: string;
	native: LangCode;
	learning: LangCode;
	level: LevelCode;
	online: boolean;
	/** 這個人的房間最多幾人 */
	roomSize: number;
	/** 自我介紹。⚠️ 不進字典 —— 這是使用者自己寫的內容，真實產品不會翻譯它，
	 *  所以假資料也刻意中英文混著放，才看得出真實情況的排版 */
	bio: string;
	/**
	 * 下一個有空的時間 "HH:MM"。**每個人都有** —— 詳情面板的「Next available」
	 * 是固定欄位，少了它面板高度會隨著選誰而跳動。
	 */
	freeAt: string;
	/**
	 * 現在還開放幾個名額。**選填** —— 有開房間的人才有。
	 * 卡片的狀態列有它就顯示名額、沒有就退回顯示 freeAt（設計稿上兩種各半）。
	 */
	slotsOpen?: number;
};

/**
 * ⚠️⚠️ 假資料 ⚠️⚠️
 *
 * 後端尚未建立。grep "FAKE_" 可找出專案所有假內容。
 * 頭像檔名由 id 推導（avatar-${id}.webp），所以 id 必須跟 assets/source/avatars/ 對得上。
 */
export const FAKE_MONSTERS: readonly Monster[] = raw.monsters.map((m) => ({
	...m,
	native: m.native as LangCode,
	learning: m.learning as LangCode,
	level: m.level as LevelCode,
	slotsOpen: "slotsOpen" in m ? m.slotsOpen : undefined,
}));

export type MonsterFilter = {
	/** "all" 或語言代碼 —— 比對的是對方的母語，那才是你能練到的語言 */
	language: LangCode | "all";
	level: LevelCode | "all";
	onlineOnly: boolean;
	query: string;
};

export const DEFAULT_FILTER: MonsterFilter = {
	language: "all",
	level: "all",
	onlineOnly: false,
	query: "",
};

/** 篩選在 client 對已載入的資料做，不打 API —— 跟週曆切週同一個原則 */
export function filterMonsters(monsters: readonly Monster[], f: MonsterFilter): Monster[] {
	const q = f.query.trim().toLowerCase();
	return monsters.filter(
		(m) =>
			(f.language === "all" || m.native === f.language) &&
			(f.level === "all" || m.level === f.level) &&
			(!f.onlineOnly || m.online) &&
			(!q || m.name.toLowerCase().includes(q) || m.bio.toLowerCase().includes(q)),
	);
}

/**
 * "16:00" → "4 PM" / "下午4時"；"16:30" → "4:30 PM"。
 *
 * 整點時**不輸出分鐘**，設計稿的卡片寫的是「Free at 4 PM」不是「4:00 PM」。
 * 詳情面板則刻意用 Schedule 的 formatTime（帶分鐘），跟設計稿一致。
 */
export function formatHour(time: string, locale: string): string {
	const [h, m] = time.split(":").map(Number);
	const d = new Date(2000, 0, 1, h, m);
	const options: Intl.DateTimeFormatOptions = m
		? { hour: "numeric", minute: "2-digit" }
		: { hour: "numeric" };
	return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * 把字典裡的 "{count} slots open" 填成實際文字。
 *
 * 沒有為了這件事裝 i18n 套件 —— 目前只有數量與時間兩種代入，
 * 真的需要複數規則（英文 1 slot / 2 slots）時字典就直接給兩個 key。
 */
export function fill(text: string, vars: Record<string, string | number>): string {
	return text.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
