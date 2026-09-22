import { apiUrl } from "@/api";

export type PresenceState = "active" | "idle";
/** userId → 狀態，只有還在線上的人會出現 */
export type PresenceMap = Record<string, PresenceState>;

/** 心跳。失敗（401、網路）不丟出去 —— 心跳掉一次沒關係，下一次會補上；真過期了 SessionProvider 會處理 */
export async function sendHeartbeat(state: PresenceState): Promise<void> {
	await fetch(apiUrl("/api/me/presence"), {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		credentials: "include",
		body: JSON.stringify({ state }),
	}).catch(() => undefined);
}

/**
 * 立刻離線。登出前用 fetch 等它做完；關分頁用 sendBeacon —— 它是瀏覽器保證會在頁面卸載後
 * 仍送出的唯一管道，沒有 body 所以是簡單請求（不需要 preflight），cookie 會一起帶。
 */
export async function leavePresence(): Promise<void> {
	await fetch(apiUrl("/api/me/presence/leave"), { method: "POST", credentials: "include", keepalive: true }).catch(
		() => undefined,
	);
}

export function beaconLeave(): void {
	navigator.sendBeacon(apiUrl("/api/me/presence/leave"));
}

export async function getPresence(): Promise<PresenceMap> {
	const response = await fetch(apiUrl("/api/presence"), { credentials: "include" });
	if (!response.ok) throw new Error(`presence responded ${response.status}`);
	return response.json();
}
