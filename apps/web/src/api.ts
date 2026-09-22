/**
 * 後端 API 的 origin。
 *
 * 三種來源，優先順序由上到下：
 * 1. NEXT_PUBLIC_API_ORIGIN 有值 → 照用（部署時指定）。
 * 2. NEXT_PUBLIC_API_PORT 有值（dev）→ 跟著頁面的 host 走：https://localhost:4000、https://192.168.x.x:4000…
 *    手機或第二台機器用區網 IP 開前端時 API 自動跟著，不用改設定；cookie 也因為同 host 不同 port 算 same-site。
 * 3. 都沒有（GitHub Pages 靜態站）→ 空字串：表單會打到自己的網址、拿到 404，然後顯示「連不到伺服器」。
 *    這是預期行為，不是 bug；正式上線前端會跟 API 一起上 Cloudflare。
 *
 * dev 一律 https（Next `--experimental-https` + api 共用同一份 mkcert 憑證），所以 WS 是 wss。
 */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "";
const API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "";

function apiOrigin(): string {
	if (API_ORIGIN) return API_ORIGIN;
	// SSR 沒有 location；這些函式只在瀏覽器的事件與 effect 裡被呼叫，這裡只是保險
	if (API_PORT && typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
	return "";
}

export const apiUrl = (path: string) => `${apiOrigin()}${path}`;

/**
 * WebSocket 用的 URL：同一個 origin，http → ws、https → wss。
 * 靜態站（origin 空字串）沒有後端，回相對路徑讓它自然失敗，跟 apiUrl 同一種預期行為。
 */
export const wsUrl = (path: string) => `${apiOrigin().replace(/^http/, "ws")}${path}`;
