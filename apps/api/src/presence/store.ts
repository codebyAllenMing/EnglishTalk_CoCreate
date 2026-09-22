/**
 * 線上狀態（presence）。
 *
 * 會過期的東西不進 DB：住在 cache，key 是 **sessionId** 不是 userId ——
 * 同一個人開兩台裝置，A 登出只清 A 那條，B 的心跳照樣讓他在線。讀的時候按 userId 聚合，active 蓋過 idle。
 *
 * 這個介面是給兩種實作用的：dev 用行程內的 Map（下面這個）；prod 上 Workers 要換成 Durable Object
 * （isolate 之間沒有共享記憶體），而那個 DO 之後就是自有 WS 的 hub —— WS 連線 / 斷線改寫同一張表，
 * 心跳 API 退役，前端讀到的形狀不變。
 */
export type PresenceState = "active" | "idle";

export type PresenceSnapshot = Record<string, PresenceState>;

export type PresenceStore = {
	/** 心跳：記下這條 session 的狀態與時間 */
	heartbeat(sessionId: string, userId: string, state: PresenceState): void;
	/** 登出 / 關分頁：立刻拿掉這條 session */
	leave(sessionId: string): void;
	/** 目前還活著的人，userId → 狀態 */
	snapshot(): PresenceSnapshot;
};

type Entry = { userId: string; state: PresenceState; at: number };

/** 超過這段時間沒心跳就當離線（前端每 60 秒打一次，留一次失誤的餘裕） */
export const PRESENCE_TTL_MS = 2 * 60 * 1000;

export type MemoryPresenceOptions = {
	/**
	 * 某個 user 的最後一條 session 消失（過期或登出）時呼叫，拿去寫 Users.lastSeenAt。
	 * 只在「這個人真的離線了」那一刻寫一次，不是每次心跳都敲 DB。
	 */
	onOffline?: (userId: string, lastSeenAt: Date) => void;
	now?: () => number;
};

export function createMemoryPresence(options: MemoryPresenceOptions = {}): PresenceStore {
	const now = options.now ?? Date.now;
	const entries = new Map<string, Entry>();

	const hasLiveSession = (userId: string, exceptSessionId?: string) => {
		for (const [sessionId, entry] of entries) {
			if (entry.userId === userId && sessionId !== exceptSessionId) return true;
		}
		return false;
	};

	/** 清掉過期的；每個真的離線的人通知一次 */
	const sweep = () => {
		const cutoff = now() - PRESENCE_TTL_MS;
		const expired: Entry[] = [];
		for (const [sessionId, entry] of entries) {
			if (entry.at < cutoff) {
				entries.delete(sessionId);
				expired.push(entry);
			}
		}
		for (const entry of expired) {
			if (!hasLiveSession(entry.userId)) options.onOffline?.(entry.userId, new Date(entry.at));
		}
	};

	return {
		heartbeat(sessionId, userId, state) {
			entries.set(sessionId, { userId, state, at: now() });
		},
		leave(sessionId) {
			const entry = entries.get(sessionId);
			if (!entry) return;
			entries.delete(sessionId);
			if (!hasLiveSession(entry.userId)) options.onOffline?.(entry.userId, new Date(now()));
		},
		snapshot() {
			sweep();
			const result: PresenceSnapshot = {};
			for (const entry of entries.values()) {
				// active 蓋過 idle：任一裝置在動就算在動
				if (result[entry.userId] !== "active") result[entry.userId] = entry.state;
			}
			return result;
		},
	};
}
