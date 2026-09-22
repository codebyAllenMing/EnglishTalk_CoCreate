import { apiUrl } from "@/api";

/**
 * 前端的例外留痕：console 一份、再丟一份到 api 的 `POST /api/client-log`，跟 server 的 log 排在同一個地方
 * （使用者 2026-09-22：「發生例外寫 log，至少我們好追蹤」）。手機在別的網路上視訊接不上，看 api 的 terminal 就知道卡在哪一步。
 *
 * 送不出去就算了（沒登入、api 掛了），不能因為 log 再炸一次。
 */
export function reportError(scope: string, error: unknown, context: Record<string, unknown> = {}) {
	const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
	console.error(`[${scope}]`, message, context, error instanceof Error ? error.stack : "");
	if (typeof window === "undefined") return;
	fetch(apiUrl("/api/client-log"), {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ scope, message, context: { ...context, url: window.location.pathname } }),
		keepalive: true,
	}).catch(() => undefined);
}
