import { TLSocketRoom, type WebSocketMinimal } from "@tldraw/sync-core";

export type WhiteboardHubOptions = {
	/** 最後一個人離開之後多久銷毀（讓重新整理的人接回同一塊板子）。預設 60 秒 */
	idleCloseMs?: number;
	/** 房間 endDate 之後多久銷毀。預設 5 分鐘 */
	graceAfterEndMs?: number;
	log?: (message: string) => void;
};

export type WhiteboardConnection = {
	/** 房號 = 一塊白板。呼叫端已經驗過這個人能進這間房 */
	code: string;
	/** tldraw 客戶端在連線 URL 帶的 sessionId，一個分頁一個 */
	sessionId: string;
	socket: WebSocketMinimal;
	/** 房間結束時間，過了就整塊板子丟掉 */
	endDate: Date;
};

export type WhiteboardHub = {
	connect(input: WhiteboardConnection): void;
	/** 目前活著的白板數 */
	size(): number;
	close(code: string): void;
	closeAll(): void;
};

type Entry = {
	room: TLSocketRoom;
	idleTimer: ReturnType<typeof setTimeout> | null;
	endTimer: ReturnType<typeof setTimeout>;
};

/**
 * 白板 hub：`Map<房號, TLSocketRoom>`，一間房一塊板子、各自的 store 與 socket 清單，
 * 廣播只在自己那一組裡發生 —— 隔離是資料結構上的，不是過濾。
 *
 * 這一層不認識 auth、DB、HTTP：誰能連由呼叫端（node.ts 的 authorize）決定，這裡只管板子的生命週期：
 *   - 第一個人連進來才建（lazy）
 *   - 最後一個人離開後 idleCloseMs 沒人再連就銷毀；期間有人回來就取消銷毀
 *   - 房間 endDate + graceAfterEndMs 到了無論如何銷毀
 *   - 內容只活在記憶體，行程重啟就沒了（定案：白板只在房間開著時持久化）
 *
 * prod 換 Cloudflare Durable Object 時，一個 DO 就是這裡的一個 Entry（`idFromName(code)`），
 * TLSocketRoom 的用法一模一樣，只是 Map 從記憶體變成 Cloudflare 幫你分散。
 */
export function createWhiteboardHub(options: WhiteboardHubOptions = {}): WhiteboardHub {
	const idleCloseMs = options.idleCloseMs ?? 60_000;
	const graceAfterEndMs = options.graceAfterEndMs ?? 5 * 60_000;
	const log = options.log ?? (() => undefined);
	const entries = new Map<string, Entry>();

	const destroy = (code: string) => {
		const entry = entries.get(code);
		if (!entry) return;
		entries.delete(code);
		if (entry.idleTimer) clearTimeout(entry.idleTimer);
		clearTimeout(entry.endTimer);
		entry.room.close();
		log(`whiteboard ${code} closed (${entries.size} left)`);
	};

	const get = (code: string, endDate: Date): Entry => {
		const existing = entries.get(code);
		if (existing) return existing;

		const room = new TLSocketRoom({
			onSessionRemoved: (_room, { numSessionsRemaining }) => {
				const entry = entries.get(code);
				if (!entry || numSessionsRemaining > 0) return;
				entry.idleTimer = setTimeout(() => destroy(code), idleCloseMs);
			},
		});
		const untilEnd = Math.max(0, endDate.getTime() + graceAfterEndMs - Date.now());
		const entry: Entry = { room, idleTimer: null, endTimer: setTimeout(() => destroy(code), untilEnd) };
		entries.set(code, entry);
		log(`whiteboard ${code} opened (${entries.size} total)`);
		return entry;
	};

	return {
		connect({ code, sessionId, socket, endDate }) {
			const entry = get(code, endDate);
			if (entry.idleTimer) {
				clearTimeout(entry.idleTimer);
				entry.idleTimer = null;
			}
			entry.room.handleSocketConnect({ sessionId, socket });
		},
		size: () => entries.size,
		close: destroy,
		closeAll() {
			for (const code of [...entries.keys()]) destroy(code);
		},
	};
}
