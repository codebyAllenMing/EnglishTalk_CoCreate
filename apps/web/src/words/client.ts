import { apiUrl } from "@/api";
import type { LangCode } from "@/Components/Profile/profileData";
import type { Dictionary } from "@/dictionaries";

/** 詞性的字典 key（room.saveWord.posOptions）；DB 存的是 id，見 WORD_POS */
export type PosCode = keyof Dictionary["room"]["saveWord"]["posOptions"];
export type WordPosId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * 詞性 enum，跟 packages/db 的 WORD_POS 同一份（web 不相依 db 套件，所以抄一份）。
 * 順序就是下拉的順序；成語獨立一項是使用者留這欄的理由。
 */
export const WORD_POS: readonly { id: WordPosId; code: PosCode }[] = [
	{ id: 1, code: "noun" },
	{ id: 2, code: "verb" },
	{ id: 3, code: "adjective" },
	{ id: 4, code: "adverb" },
	{ id: 5, code: "phrase" },
	{ id: 6, code: "idiom" },
	{ id: 7, code: "other" },
];

export const posCodeOf = (id: WordPosId): PosCode => WORD_POS.find((p) => p.id === id)?.code ?? "other";

/** 跟 apps/api 的 routes/words.ts 的 WordItem 同形狀 */
export type WordItem = {
	id: number;
	word: string;
	pos: WordPosId;
	meaning: string;
	/** 來源訊息的原句 —— 就是例句 */
	example: string;
	lang: LangCode;
	/** ISO */
	createDate: string;
};

export type WordInput = {
	word: string;
	pos: WordPosId;
	meaning: string;
	example: string;
	lang: LangCode;
};

export type SaveWordResult =
	| { ok: true; item: WordItem }
	/** duplicate：同一個字已經在字典裡（409）；invalid：驗證不過（400）；denied：不在這房 / 房沒開（403 / 404 / 410） */
	| { ok: false; reason: "duplicate" | "invalid" | "denied" | "network" };

const room = (code: string) => `/api/rooms/${encodeURIComponent(code)}/words`;

/** 這場存的字（只有自己的）。失敗回 null，面板照空的畫 —— 存字那一刻會再遇到同樣的錯 */
export async function getRoomWords(code: string): Promise<WordItem[] | null> {
	try {
		const response = await fetch(apiUrl(room(code)), { credentials: "include" });
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
}

/** 整本（home 的 Word Bank 頁用；那頁還沒做） */
export async function getMyWords(): Promise<WordItem[] | null> {
	try {
		const response = await fetch(apiUrl("/api/me/words"), { credentials: "include" });
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
}

export async function saveRoomWord(code: string, input: WordInput): Promise<SaveWordResult> {
	let response: Response;
	try {
		response = await fetch(apiUrl(room(code)), {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(input),
		});
	} catch {
		return { ok: false, reason: "network" };
	}
	if (response.ok) return { ok: true, item: await response.json() };
	if (response.status === 409) return { ok: false, reason: "duplicate" };
	if (response.status === 400) return { ok: false, reason: "invalid" };
	if (response.status === 403 || response.status === 404 || response.status === 410) return { ok: false, reason: "denied" };
	return { ok: false, reason: "network" };
}

/** 軟刪。已經不在（404）也算成功 —— 畫面上反正要拿掉 */
export async function deleteWord(id: number): Promise<boolean> {
	try {
		const response = await fetch(apiUrl(`/api/me/words/${id}`), { method: "DELETE", credentials: "include" });
		return response.ok || response.status === 404;
	} catch {
		return false;
	}
}
