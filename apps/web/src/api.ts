/**
 * 後端 API 的 origin。
 *
 * dev 預設打本機的 apps/api（http://localhost:4000）；build 時由 NEXT_PUBLIC_API_ORIGIN 決定，
 * 值在 next.config.ts 的 env 注入，跟 NEXT_PUBLIC_BASE_PATH 同一個做法、單一來源。
 *
 * ⚠️ GitHub Pages 的靜態站沒有後端，值是空字串 —— 表單會打到自己的網址、拿到 404，
 *    然後顯示「連不到伺服器」。這是預期行為，不是 bug；正式上線前端會跟 API 一起上 Cloudflare。
 */
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "";

export const apiUrl = (path: string) => `${API_ORIGIN}${path}`;

/**
 * WebSocket 用的 URL：同一個 origin，http → ws、https → wss。
 * 靜態站（origin 空字串）沒有後端，回相對路徑讓它自然失敗，跟 apiUrl 同一種預期行為。
 */
export const wsUrl = (path: string) => `${API_ORIGIN.replace(/^http/, "ws")}${path}`;
