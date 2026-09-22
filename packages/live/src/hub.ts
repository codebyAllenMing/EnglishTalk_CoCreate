import type { ChatMessage, LiveUser, ServerMessage } from "./protocol.ts";

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
};

export type LiveConnection = {
	code: string;
	socket: SocketLike;
	/** 握手時查好的人，訊息的 from 用它的 id */
	user: LiveUser;
	endDate: Date;
};

export type LiveHub = {
	connect(input: LiveConnection): void;
	size(): number;
	close(code: string): void;
	closeAll(): void;
};

type Client = { socket: SocketLike; user: LiveUser };
type Room = { clients: Set<Client>; history: ChatMessage[]; endTimer: ReturnType<typeof setTimeout> };

/**
 * 房間即時通道的 hub：`Map<房號, Room>`，一間房一組 socket 清單與一份訊息歷史，廣播只在自己那一組。
 *
 * 跟白板 hub 同一個模型，差別在生命週期：**不做閒置銷毀**，只在 endDate + grace 銷毀 ——
 * 所有人離開再回來歷史還在（使用者 2026-09-22 定案：房間開著的期間歷史要完整）。
 * 訊息只活在記憶體，行程重啟就沒了；要留下來是另一張 RoomMessages 表的事，協定不用動。
 *
 * 這一層不認識 auth、DB：誰能連由呼叫端（node.ts 的 authorize）決定。
 */
export function createLiveHub(options: LiveHubOptions = {}): LiveHub {
	const graceAfterEndMs = options.graceAfterEndMs ?? 5 * 60_000;
	const historyLimit = options.historyLimit ?? 200;
	const textLimit = options.textLimit ?? 500;
	const log = options.log ?? (() => undefined);
	const rooms = new Map<string, Room>();

	const online = (room: Room) => [...new Set([...room.clients].map((c) => c.user.id))];

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

	const destroy = (code: string) => {
		const room = rooms.get(code);
		if (!room) return;
		rooms.delete(code);
		clearTimeout(room.endTimer);
		for (const client of room.clients) client.socket.close(1000, "room ended");
		log(`live ${code} closed (${rooms.size} left)`);
	};

	const get = (code: string, endDate: Date): Room => {
		const existing = rooms.get(code);
		if (existing) return existing;
		const untilEnd = Math.max(0, endDate.getTime() + graceAfterEndMs - Date.now());
		const room: Room = { clients: new Set(), history: [], endTimer: setTimeout(() => destroy(code), untilEnd) };
		rooms.set(code, room);
		log(`live ${code} opened (${rooms.size} total)`);
		return room;
	};

	return {
		connect({ code, socket, user, endDate }) {
			const room = get(code, endDate);
			const client: Client = { socket, user };
			room.clients.add(client);

			socket.addEventListener("message", (event) => {
				const text = parseChat(event.data, textLimit);
				if (text === null) return;
				const message: ChatMessage = { id: crypto.randomUUID(), from: user.id, at: new Date().toISOString(), text };
				room.history.push(message);
				if (room.history.length > historyLimit) room.history.splice(0, room.history.length - historyLimit);
				broadcast(room, { type: "chat", message });
			});

			const leave = () => {
				if (!room.clients.delete(client)) return;
				// 房間已經銷毀的話 rooms 裡沒有它，不用再廣播
				if (rooms.get(code) === room) broadcast(room, { type: "presence", online: online(room) });
			};
			socket.addEventListener("close", leave);
			socket.addEventListener("error", leave);

			socket.send(JSON.stringify({ type: "hello", you: user.id, online: online(room), history: room.history } satisfies ServerMessage));
			broadcast(room, { type: "presence", online: online(room) });
		},
		size: () => rooms.size,
		close: destroy,
		closeAll() {
			for (const code of [...rooms.keys()]) destroy(code);
		},
	};
}

/** 只認 { type: "chat", text }；去頭尾空白、空的與超長的丟掉（超長截斷會讓對方看到半句，不如不送） */
function parseChat(data: unknown, textLimit: number): string | null {
	const raw = typeof data === "string" ? data : data instanceof Uint8Array ? new TextDecoder().decode(data) : null;
	if (raw === null) return null;
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return null;
	}
	if (typeof parsed !== "object" || parsed === null || !("type" in parsed) || parsed.type !== "chat") return null;
	const text = "text" in parsed && typeof parsed.text === "string" ? parsed.text.trim() : "";
	if (!text || text.length > textLimit) return null;
	return text;
}
