/**
 * 房間計時器的純邏輯。server（hub）與前端（RoomProvider）共用同一份，兩邊算出來的數字才會一樣。
 *
 * ⚠️ 這個檔案**不能 import 任何東西**：前端透過 `@monstertalk/live/timer` 直接吃這份 TS 原始碼，
 *    帶 `.ts` 副檔名的 import 在 web 的 tsconfig 下會報錯。
 *
 * 模型（使用者 2026-09-21 / 2026-09-22 定案）：
 * - 開房選 20 / 40 / 60 分，對半切成兩桶；一次只有一桶倒數，另一桶暫停。
 * - **不存「剩幾秒」每秒減一**，存「在跑那桶從哪一刻（since）開始、那一刻剩幾秒」，剩餘隨時用牆鐘算。
 *   背景分頁的 setInterval 被節流也沒差，回來那一刻算出來的數字就是對的。
 * - 房間 `startDate` 自動起跑（since = startDate），不管有沒有人進來；先跑 roomType 的 `to`（要學習的那一語）。
 * - ⇄ 任何人都能按、全房同步、5 秒緩衝後才換；再按一次取消。
 * - **「該換了」的判定只在 settle() 一處**：server 在 swap 進來、swapAt 到點、桶歸零時跑一次並廣播；
 *   client 拿到狀態後用同一支從牆鐘推，廣播只是校正。
 */
export type TimerLang = "zh" | "en";

export type TimerState = {
	active: TimerLang;
	/** 秒。沒在跑的那桶是實際剩餘；在跑的那桶是 since 那一刻的剩餘 */
	remaining: Record<TimerLang, number>;
	/** 在跑那桶開始計的時刻（server 時間，ms） */
	since: number;
	/** 排程中的切換要在哪一刻生效（ms）；null = 沒有 */
	swapAt: number | null;
	ended: boolean;
};

export type TimerInit = {
	/** ms */
	startDate: number;
	durationMinutes: number;
	firstLang: TimerLang;
};

/** 按 ⇄ 到真的換邊的緩衝（使用者 2026-09-21：「不能讓他馬上切，要等個 5 秒」） */
export const SWAP_DELAY_MS = 5000;

export const otherLang = (lang: TimerLang): TimerLang => (lang === "zh" ? "en" : "zh");

export function initialTimer({ startDate, durationMinutes, firstLang }: TimerInit): TimerState {
	const half = (durationMinutes * 60) / 2;
	return { active: firstLang, remaining: { zh: half, en: half }, since: startDate, swapAt: null, ended: false };
}

/**
 * 在跑的那桶此刻剩幾秒（可能是負的 —— 代表已經跑完、超出的秒數要算給另一桶）。
 * since 還沒到（房間開始前 5 分鐘就能進來）就是整桶，不倒數。
 */
export function leftOf(t: TimerState, at: number): number {
	return t.remaining[t.active] - Math.max(0, at - t.since) / 1000;
}

/**
 * 結算：排程的切換到點了就換、在跑的那桶跑完了就換另一桶、兩桶都完就結束。
 * **回傳同一個物件代表沒事**，呼叫端拿這個判斷要不要廣播 / 重繪。
 *
 * 換桶時另一桶的 since 是「換邊那一刻」（排程的時間戳、或前一桶剛好歸零的那一刻），
 * 不是 now —— 背景分頁回來、或 server 的 timer 晚了幾百毫秒，那段時間要算進另一桶。
 * 換完遞迴再結算一次：那段時間可能連另一桶也跑完了。
 */
export function settle(t: TimerState, at: number): TimerState {
	if (t.ended) return t;
	const other = otherLang(t.active);
	const zeroAt = t.since + t.remaining[t.active] * 1000;

	// 排程的切換先到、桶還沒空 → 手動換邊
	if (t.swapAt !== null && t.swapAt <= at && t.swapAt < zeroAt) {
		const swapped: TimerState = {
			active: other,
			remaining: { ...t.remaining, [t.active]: leftOf(t, t.swapAt) },
			since: t.swapAt,
			swapAt: null,
			ended: false,
		};
		return settle(swapped, at);
	}

	if (leftOf(t, at) > 0) return t;

	// 桶空了：排程中的切換作廢（反正要換了）
	const otherLeft = t.remaining[other] - (at - zeroAt) / 1000;
	if (otherLeft <= 0) return { ...t, remaining: { zh: 0, en: 0 }, swapAt: null, ended: true };
	return { active: other, remaining: { ...t.remaining, [t.active]: 0 }, since: zeroAt, swapAt: null, ended: false };
}

/**
 * 有人按了 ⇄：先結算到現在，再排一個 5 秒後的切換；已經有排程就取消。
 * 回傳同一個物件代表沒變（已結束、還沒開始、另一桶已經空了）。
 */
export function requestSwap(t: TimerState, at: number): TimerState {
	const current = settle(t, at);
	if (current.ended) return current;
	// 房間還沒開始（since 在未來）：這時候切會讓另一桶從開始前就算時間
	if (at < current.since) return current;
	if (current.swapAt !== null) return { ...current, swapAt: null };
	if (current.remaining[otherLang(current.active)] <= 0) return current;
	return { ...current, swapAt: at + SWAP_DELAY_MS };
}

/** server 下一次要主動結算的時刻（swapAt 或桶歸零，先到的那個）；已結束回 null */
export function nextEventAt(t: TimerState): number | null {
	if (t.ended) return null;
	const zeroAt = t.since + t.remaining[t.active] * 1000;
	return t.swapAt !== null && t.swapAt < zeroAt ? t.swapAt : zeroAt;
}
