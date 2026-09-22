/**
 * 「現在能不能進房」的前端判斷。跟 packages/db 的 ROOM_ENTRY_LEAD_MINUTES 同值（5 分鐘）；
 * 這裡只決定按鈕亮不亮，後端 `roomAccess` 一定再擋一次（WS 握手、視訊 session 都過那一關）。
 */
export const ENTRY_LEAD_MS = 5 * 60_000;

export type EntryPhase = "before" | "open" | "ended";
export type EntryState = { phase: EntryPhase; /** 可進入的那一刻（ms） */ opensAt: number; /** 距離可進入還有幾 ms（before 才有意義） */ opensIn: number };

export function entryState(start: number, end: number, now: number): EntryState {
	const opensAt = start - ENTRY_LEAD_MS;
	if (now >= end) return { phase: "ended", opensAt, opensIn: 0 };
	if (now >= opensAt) return { phase: "open", opensAt, opensIn: 0 };
	return { phase: "before", opensAt, opensIn: opensAt - now };
}

/** ms → "m:ss"（一小時內）或 "h:mm:ss" */
export function formatCountdown(ms: number): string {
	const total = Math.max(0, Math.ceil(ms / 1000));
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const s = total % 60;
	const pad = (n: number) => String(n).padStart(2, "0");
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
