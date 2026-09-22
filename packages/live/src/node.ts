import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import type { LiveHub } from "./hub.ts";
import type { LiveUser } from "./protocol.ts";

export type UpgradeDecision =
	| { ok: true; endDate: Date; user: LiveUser }
	/** HTTP 狀態碼直接回給握手：401 沒登入、403 不是成員 / 不在時間窗、404 房不存在、410 已取消 */
	| { ok: false; status: 401 | 403 | 404 | 410; reason: string };

export type AttachOptions = {
	hub: LiveHub;
	/** 只接受這個 Origin 的握手（瀏覽器一定會帶） */
	origin: string;
	/**
	 * 誰能連，以及他是誰。這裡是安全層：頁面那層的檢查擋不住直接開 WS 的人，這一關一定要查 DB。
	 */
	authorize: (req: IncomingMessage, code: string) => Promise<UpgradeDecision>;
	/** 從 URL path 取房號；預設 /api/rooms/:code/live */
	matchPath?: (pathname: string) => string | null;
	log?: (message: string) => void;
};

const DEFAULT_PATH = /^\/api\/rooms\/([^/]+)\/live$/;
const STATUS_TEXT: Record<number, string> = { 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 410: "Gone" };

/**
 * 把即時通道掛到 Node 的 http server 上。跟 packages/whiteboard 的 attach 是同一個模式、各認各的路徑，
 * 可以掛在同一個 server 上並存；路徑對不上的 upgrade 不碰。
 * Workers 上換 Durable Object 的 fetch handler，hub 不變。
 */
export function attachLiveServer(server: Server, options: AttachOptions): void {
	const { hub, origin, authorize } = options;
	const matchPath = options.matchPath ?? ((pathname: string) => DEFAULT_PATH.exec(pathname)?.[1] ?? null);
	const log = options.log ?? (() => undefined);
	const wss = new WebSocketServer({ noServer: true });

	const reject = (socket: Duplex, status: number, reason: string) => {
		socket.write(`HTTP/1.1 ${status} ${STATUS_TEXT[status] ?? "Error"}\r\nConnection: close\r\n\r\n`);
		socket.destroy();
		log(`live upgrade rejected ${status} ${reason}`);
	};

	server.on("upgrade", (req, socket, head) => {
		const url = new URL(req.url ?? "/", "http://localhost");
		const code = matchPath(url.pathname);
		if (!code) return;
		if (req.headers.origin !== origin) return reject(socket, 403, "origin");

		authorize(req, code).then(
			(decision) => {
				if (!decision.ok) return reject(socket, decision.status, decision.reason);
				wss.handleUpgrade(req, socket, head, (ws) => {
					hub.connect({ code, socket: ws, user: decision.user, endDate: decision.endDate });
				});
			},
			(error: unknown) => {
				console.error("live authorize failed", error);
				reject(socket, 403, "error");
			},
		);
	});
}
