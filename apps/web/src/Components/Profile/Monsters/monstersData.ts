import type { PresenceMap, PresenceState } from "@/presence/client";
import type { PublicUser } from "@/profile/client";
import type { LangCode, LevelCode } from "../profileData";

/**
 * 格狀與面板用的一隻怪獸 = 一個別的使用者 + 他此刻的線上狀態。
 * 由 fromPublicUser() 把 /api/users 與 /api/presence 合起來；設定頁的預覽也是自己組一個。
 */
export type Monster = {
	id: string;
	name: string;
	/** Avatars 的 code，對 public/images/avatar-<code>.webp */
	avatar: string;
	native: LangCode;
	learning: LangCode;
	/** 學習語言的程度 —— 卡片與面板顯示的是這個 */
	level: LevelCode;
	/** null = 離線 */
	presence: PresenceState | null;
	/** 離線時「最後上線」用；從沒上線過是 null */
	lastSeenAt: string | null;
	/** 自我介紹。使用者自己寫的內容，不進字典、不翻譯 */
	bio: string;
};

export function fromPublicUser(user: PublicUser, presence: PresenceMap): Monster {
	return {
		id: user.id,
		name: user.name,
		avatar: user.avatar,
		native: user.nativeLang,
		learning: user.learningLang,
		level: user.learningLevel,
		presence: presence[user.id] ?? null,
		lastSeenAt: user.lastSeenAt,
		bio: user.bio,
	};
}

export type MonsterFilter = {
	/** "all" 或語言代碼 —— 比對的是對方的母語，那才是你能練到的語言 */
	language: LangCode | "all";
	level: LevelCode | "all";
	/** active 與 idle 都算線上 */
	onlineOnly: boolean;
	query: string;
};

export const DEFAULT_FILTER: MonsterFilter = {
	language: "all",
	level: "all",
	onlineOnly: false,
	query: "",
};

/** 篩選在 client 對已載入的名單做，不打 API —— 名單一次最多 50 人，超過再搬到 server */
export function filterMonsters(monsters: readonly Monster[], f: MonsterFilter): Monster[] {
	const q = f.query.trim().toLowerCase();
	return monsters.filter(
		(m) =>
			(f.language === "all" || m.native === f.language) &&
			(f.level === "all" || m.level === f.level) &&
			(!f.onlineOnly || m.presence !== null) &&
			(!q || m.name.toLowerCase().includes(q) || m.bio.toLowerCase().includes(q)),
	);
}

/**
 * "2026-09-22T10:00:00Z" → "2 小時前" / "2 hours ago"。交給 Intl，字典不用維護單位。
 * 一分鐘內顯示「剛剛」那一類的話（numeric: "auto" 的 "now"）。
 */
export function formatLastSeen(iso: string, locale: string, now = Date.now()): string {
	const seconds = Math.round((Date.parse(iso) - now) / 1000);
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
	const abs = Math.abs(seconds);
	if (abs < 60) return rtf.format(0, "second");
	if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
	if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
	if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
	return rtf.format(Math.round(seconds / (86400 * 30)), "month");
}

/**
 * 把字典裡的 "{name} …" 填成實際文字。
 *
 * 沒有為了這件事裝 i18n 套件 —— 目前只有幾種代入，
 * 真的需要複數規則時字典就直接給兩個 key。
 */
export function fill(text: string, vars: Record<string, string | number>): string {
	return text.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? ""));
}
