import type { ChatMessage, ClientMessage, LiveUser, MediaState, ServerMessage } from "./protocol.ts";
import { initialTimer, nextEventAt, requestSwap, settle, type TimerInit, type TimerState } from "./timer.ts";

/** 最小的 socket 介面：ws 套件與 Cloudflare 的 WebSocket 都有這三個 */
export type SocketLike = {
	send(data: string): void;
	close(code?: number, reason?: string): void;
	addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
	addEventListener(type: "close", listener: () => void): void;
	addEventListener(type: "error", listener: () => void): void;
};

export type LiveHubOptions = {
	/** 房間 endDate 之後多久銷毀。預設 5 分鐘 */
	graceAfterEndMs?: number;
	/** 歷史留幾則。預設 200 */
	historyLimit?: number;
	/** 單則幾個字。預設 500 */
	textLimit?: number;
	log?: (message: string) => void;
	/** 處理訊息時的例外（不會讓 hub 掛掉，但要留痕）。預設 console.error */
	onError?: (error: unknown, context: { code: string; userId: string; type?: string }) => void;
};

export type LiveConnection = {
	code: string;
	socket: SocketLike;
	/** 握手時查好的人，訊息的 from 用它的 id */
	user: LiveUser;
	endDate: Date;
	/** 計時器的起點：房間的 startDate / 時長 / 先跑哪一語。第一個人連上時拿來初始化，之後的人不看 */
	timer: TimerInit;
};

export type LiveHub = {
	connect(input: LiveConnection): void;
	size(): number;
	close(code: string): void;
	closeAll(): void;
};

type Client = { socket: SocketLike; user: LiveUser; /** 最後一次送來的視訊狀態 */ media?: MediaState };
type Room = {
	clients: Set<Client>;
	history: ChatMessage[];
	endTimer: ReturnType<typeof setTimeout>;
	/** 權威的計時器狀態；只在 swap / 到點結算時改 */
	timer: TimerState;
	/** 下一次主動結算（swapAt 或桶歸零）的 setTimeout */
	timerTimer: ReturnType<typeof setTimeout> | null;
};

/** 主動結算的 setTimeout 多等一點，免得 timer 早到幾毫秒、settle 說「還沒」又立刻重排 */
const SETTLE_MARGIN_MS = 20;

/**
 * 房間即時通道的 hub：`Map<房號, Room>`，一間房一組 socket 清單、一份訊息歷史、一份計時器狀態，廣播只在自己那一組。
 *
 * 跟白板 hub 同一個模型，差別在生命週期：**不做閒置銷毀**，只在 endDate + grace 銷毀 ——
 * 所有人離開再回來歷史還在（使用者 2026-09-22 定案：房間開著的期間歷史要完整）。
 * 訊息只活在記憶體，行程重啟就沒了；要留下來是另一張 RoomMessages 表的事，協定不用動。
 *
 * 視訊狀態（media）：只轉發與記住，媒體本身在 Cloudflare SFU。hello 帶每個在線的人最後一次的狀態，晚進來的照單去拉。
 *
 * 計時器：server 是權威時鐘，但**不每秒廣播**。狀態只在 swap 進來、swapAt 到點、桶歸零時改一次並廣播，
 * client 拿狀態用同一支 settle() 從牆鐘推。行程重啟後狀態重建成「從 startDate 跑到現在、沒切過」。
 *
 * 這一層不認識 auth、DB：誰能連由呼叫端（node.ts 的 authorize）決定。
 */
export function createLiveHub(options: LiveHubOptions = {}): LiveHub {
	const graceAfterEndMs = options.graceAfterEndMs ?? 5 * 60_000;
	const historyLimit = options.historyLimit ?? 200;
	const textLimit = options.textLimit ?? 500;
	const log = options.log ?? (() => undefined);
	const onError = options.onError ?? ((error, context) => console.error("live hub error", context, error));
	const rooms = new Map<string, Room>();

	const online = (room: Room) => [...new Set([...room.clients].map((c) => c.user.id))];

	/** 同一人多分頁：最後送過 media 的那個分頁算數 */
	const mediaOf = (room: Room): Record<string, MediaState> => {
		const map: Record<string, MediaState> = {};
		for (const client of room.clients) if (client.media) map[client.user.id] = client.media;
		return map;
	};

	const broadcast = (room: Room, message: ServerMessage) => {
		const data = JSON.stringify(message);
		for (const client of room.clients) {
			try {
				client.socket.send(data);
			} catch {
				// 對方剛好斷線；close 事件會把它清掉
			}
		}
	};

	/** 把 server 的 timer 排到下一個事件點；到點結算、有變就廣播、再排下一個 */
	const scheduleTimer = (code: string, room: Room) => {
		if (room.timerTimer) clearTimeout(room.timerTimer);
		room.timerTimer = null;
		const at = nextEventAt(room.timer);
		if (at === null) return;
		room.timerTimer = setTimeout(
			() => {
				room.timerTimer = null;
				if (rooms.get(code) !== room) return;
				const next = settle(room.timer, Date.now());
				if (next !== room.timer) {
					room.timer = next;
					broadcast(room, { type: "timer", timer: next });
				}
				scheduleTimer(code, room);
			},
			Math.max(0, at - Date.now()) + SETTLE_MARGIN_MS,
		);
	};

	const destroy = (code: string) => {
		const room = rooms.get(code);
		if (!room) return;
		rooms.delete(code);
		clearTimeout(room.endTimer);
		if (room.timerTimer) clearTimeout(room.timerTimer);
		for (const client of room.clients) client.socket.close(1000, "room ended");
		log(`live ${code} closed (${rooms.size} left)`);
	};

	const get = (code: string, endDate: Date, init: TimerInit): Room => {
		const existing = rooms.get(code);
		if (existing) return existing;
		const untilEnd = Math.max(0, endDate.getTime() + graceAfterEndMs - Date.now());
		const room: Room = {
			clients: new Set(),
			history: [],
			endTimer: setTimeout(() => destroy(code), untilEnd),
			timer: settle(initialTimer(init), Date.now()),
			timerTimer: null,
		};
		rooms.set(code, room);
		scheduleTimer(code, room);
		log(`live ${code} opened (${rooms.size} total)`);
		return room;
	};

	return {
		connect({ code, socket, user, endDate, timer }) {
			const room = get(code, endDate, timer);
			const client: Client = { socket, user };
			room.clients.add(client);

			socket.addEventListener("message", (event) => {
				const msg = parseMessage(event.data, textLimit);
				if (!msg) return;
				try {
					handle(msg);
				} catch (error) {
					onError(error, { code, userId: user.id, type: msg.type });
				}
			});

			const handle = (msg: ClientMessage) => {
				if (msg.type === "chat") {
					const message: ChatMessage = { id: crypto.randomUUID(), from: user.id, at: new Date().toISOString(), text: msg.text };
					room.history.push(message);
					if (room.history.length > historyLimit) room.history.splice(0, room.history.length - historyLimit);
					broadcast(room, { type: "chat", message });
				} else if (msg.type === "swap") {
					const next = requestSwap(room.timer, Date.now());
					if (next === room.timer) return;
					room.timer = next;
					broadcast(room, { type: "timer", timer: next });
					scheduleTimer(code, room);
				} else if (msg.type === "media") {
					client.media = msg.media;
					broadcast(room, { type: "media", user: user.id, media: msg.media });
				} else if (msg.type === "ping") {
					// keepalive：只回給送的人，不廣播
					socket.send(JSON.stringify({ type: "pong" } satisfies ServerMessage));
				}
			};

			const leave = () => {
				if (!room.clients.delete(client)) return;
				// 房間已經銷毀的話 rooms 裡沒有它，不用再廣播
				if (rooms.get(code) === room) broadcast(room, { type: "presence", online: online(room) });
			};
			socket.addEventListener("close", leave);
			socket.addEventListener("error", leave);

			const now = Date.now();
			room.timer = settle(room.timer, now);
			const hello: ServerMessage = {
				type: "hello",
				you: user.id,
				online: online(room),
				history: room.history,
				timer: room.timer,
				now,
				media: mediaOf(room),
			};
			socket.send(JSON.stringify(hello));
			broadcast(room, { type: "presence", online: online(room) });
		},
		size: () => rooms.size,
		close: destroy,
		closeAll() {
			for (const code of [...rooms.keys()]) destroy(code);
		},
	};
}

/**
 * 只認協定裡的三種 client 訊息，其他丟掉。
 * chat：去頭尾空白、空的與超長的丟掉（超長截斷會讓對方看到半句，不如不送）。
 * media：sessionId 是字串或 null、mic / cam 是布林，形狀不對就丟。
 */
function parseMessage(data: unknown, textLimit: number): ClientMessage | null {
	const raw = typeof data === "string" ? data : data instanceof Uint8Array ? new TextDecoder().decode(data) : null;
	if (raw === null) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	if (typeof parsed !== "object" || parsed === null || !("type" in parsed)) return null;
	if (parsed.type === "swap") return { type: "swap" };
	if (parsed.type === "ping") return { type: "ping" };
	if (parsed.type === "media") return parseMedia("media" in parsed ? parsed.media : undefined);
	if (parsed.type !== "chat") return null;
	const text = "text" in parsed && typeof parsed.text === "string" ? parsed.text.trim() : "";
	if (!text || text.length > textLimit) return null;
	return { type: "chat", text };
}

function parseMedia(value: unknown): ClientMessage | null {
	if (typeof value !== "object" || value === null) return null;
	const v = value as { sessionId?: unknown; mic?: unknown; cam?: unknown };
	const sessionId = v.sessionId === null ? null : typeof v.sessionId === "string" && v.sessionId.length <= 128 ? v.sessionId : undefined;
	if (sessionId === undefined || typeof v.mic !== "boolean" || typeof v.cam !== "boolean") return null;
	return { type: "media", media: { sessionId, mic: v.mic, cam: v.cam } };
}
