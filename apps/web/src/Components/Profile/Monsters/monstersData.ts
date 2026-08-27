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
	/** 下一個有空的時間 "HH:MM"。與 slotsOpen 二選一 */
	freeAt?: string;
	/** 開放名額。與 freeAt 二選一 */
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
	freeAt: "freeAt" in m ? m.freeAt : undefined,
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
