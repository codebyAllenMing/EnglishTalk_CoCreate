/**
 * log 格式（使用者 2026-09-22：「發生例外寫 log，至少我們好追蹤」「要寫時間 [yyyy-mm-dd hh:mm:ss] 是哪一個發生的錯誤」）：
 *
 *   [2026-09-22 23:41:05] ERROR video.upstream — TypeError: fetch failed | {"requestId":"…","userId":"…","code":"SEED09"}
 *       at fetch (node:internal/…)          ← 例外才有 stack，縮排接在下一行
 *   [2026-09-22 23:41:07] WARN  video.upstream — Cloudflare 400 | {"requestId":"…","status":400,"data":{…}}
 *   [2026-09-22 23:41:09] INFO  live — live SEED09 opened (1 total)
 *
 * 時間是 server 本地時間。前半段給人看（哪時、哪裡、什麼錯），`|` 後面是 JSON context 給 grep（requestId / userId / code / sid…）。
 * 全部走 console：dev 看 terminal，prod 上 Workers 進 `wrangler tail` / Logs，不接第三方。
 */
type Context = Record<string, unknown>;

function stamp(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function line(level: "ERROR" | "WARN " | "INFO ", scope: string, message: string, context?: Context): string {
	const tail = context && Object.keys(context).length ? ` | ${JSON.stringify(context)}` : "";
	return `[${stamp()}] ${level} ${scope} — ${message}${tail}`;
}

function describe(error: unknown): { message: string; stack?: string } {
	if (error instanceof Error) {
		const cause = error.cause === undefined ? "" : ` (cause: ${error.cause instanceof Error ? error.cause.message : String(error.cause)})`;
		return { message: `${error.name}: ${error.message}${cause}`, stack: error.stack };
	}
	return { message: typeof error === "string" ? error : JSON.stringify(error) };
}

/** 例外：一定帶 stack（縮排接在下一行） */
export function logError(scope: string, error: unknown, context: Context = {}) {
	const { message, stack } = describe(error);
	const frames = stack?.split("\n").slice(1).map((f) => `    ${f.trim()}`).join("\n");
	console.error(line("ERROR", scope, message, context) + (frames ? `\n${frames}` : ""));
}

/** 預期中的失敗（上游回錯、驗證不過）：不是例外，但要留痕 */
export function logWarn(scope: string, message: string, context: Context = {}) {
	console.warn(line("WARN ", scope, message, context));
}

export function logInfo(scope: string, message: string, context: Context = {}) {
	console.log(line("INFO ", scope, message, context));
}
