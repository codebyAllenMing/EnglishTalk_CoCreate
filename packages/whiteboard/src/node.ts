import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import type { WhiteboardHub } from "./hub.ts";

export type UpgradeDecision =
	| { ok: true; endDate: Date }
	/** HTTP 狀態碼直接回給握手：401 沒登入、403 不是成員 / 不在時間窗、404 房不存在、410 已取消 */
	| { ok: false; status: 401 | 403 | 404 | 410; reason: string };

export type AttachOptions = {
	hub: WhiteboardHub;
	/** 只接受這個 Origin 的握手（瀏覽器一定會帶） */
	origin: string;
	/**
	 * 誰能連。這裡是安全層：頁面那層的檢查擋不住直接開 WS 的人，這一關一定要查 DB。
	 * 收到 request（有 cookie）與房號，回能不能連與房間結束時間。
	 */
	authorize: (req: IncomingMessage, code: string) => Promise<UpgradeDecision>;
	/** 從 URL path 取房號；預設 /api/rooms/:code/whiteboard */
	matchPath?: (pathname: string) => string | null;
	log?: (message: string) => void;
};

const DEFAULT_PATH = /^\/api\/rooms\/([^/]+)\/whiteboard$/;
const STATUS_TEXT: Record<number, string> = {
	400: "Bad Request",
	401: "Unauthorized",
	403: "Forbidden",
	404: "Not Found",
	410: "Gone",
};

/**
 * 把白板掛到 Node 的 http server 上（dev 與自架用；Workers 上換 Durable Object 的 fetch handler，hub 不變）。
 *
 * 流程：upgrade 事件 → 路徑對上白板 → Origin 對 → authorize（cookie 驗 session、查子單、時間窗）
 * → 才 handleUpgrade → 交給 hub。任何一關沒過就用 HTTP 狀態碼回掉並關 socket，瀏覽器端 tldraw 會進 error 狀態。
 *
 * 路徑對不上的 upgrade 不碰（留給之後的聊天 WS 或別的 handler）。
 */
export function attachWhiteboardServer(server: Server, options: AttachOptions): void {
	const { hub, origin, authorize } = options;
	const matchPath = options.matchPath ?? ((pathname: string) => DEFAULT_PATH.exec(pathname)?.[1] ?? null);
	const log = options.log ?? (() => undefined);
	const wss = new WebSocketServer({ noServer: true });

	const reject = (socket: Duplex, status: number, reason: string) => {
		socket.write(`HTTP/1.1 ${status} ${STATUS_TEXT[status] ?? "Error"}\r\nConnection: close\r\n\r\n`);
		socket.destroy();
		log(`whiteboard upgrade rejected ${status} ${reason}`);
	};

	server.on("upgrade", (req, socket, head) => {
		const url = new URL(req.url ?? "/", "http://localhost");
		const code = matchPath(url.pathname);
		if (!code) return;

		if (req.headers.origin !== origin) return reject(socket, 403, "origin");
		const sessionId = url.searchParams.get("sessionId");
		if (!sessionId) return reject(socket, 400, "sessionId");

		authorize(req, code).then(
			(decision) => {
				if (!decision.ok) return reject(socket, decision.status, decision.reason);
				wss.handleUpgrade(req, socket, head, (ws) => {
					hub.connect({ code, sessionId, socket: ws, endDate: decision.endDate });
				});
			},
			(error: unknown) => {
				console.error("whiteboard authorize failed", error);
				reject(socket, 403, "error");
			},
		);
	});
}
