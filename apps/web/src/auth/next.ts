/**
 * 登入後要回到哪裡（`?next=`）。
 *
 * 沒登入的人開 `/zh-TW/room/SEED09` 會被送去 `/zh-TW/login?next=%2Fzh-TW%2Froom%2FSEED09`，
 * 登入成功就回房間，不是回 /home（發表時把房間連結貼給人，一定會走到這條）。
 *
 * 只收「同站、同語系的相對路徑」：`/zh-TW/...`。`//evil.com`、`https://…`、別的語系一律丟掉退回 fallback，
 * 免得變成 open redirect。
 *
 * 用 `window.location` 而不是 `useSearchParams`：這幾頁是靜態匯出，`useSearchParams` 要包 Suspense，
 * 而這些值都只在事件與 effect 裡讀，直接看 location 就好。
 */
export function readNext(): string | null {
	if (typeof window === "undefined") return null;
	return new URLSearchParams(window.location.search).get("next");
}

export function safeNext(value: string | null | undefined, locale: string, fallback: string): string {
	if (!value) return fallback;
	const prefix = `/${locale}/`;
	if (!value.startsWith(prefix) || value.startsWith("//") || /[\\\r\n]/.test(value)) return fallback;
	// 已經在 login / signup 就別繞回去
	if (value.startsWith(`${prefix}login`) || value.startsWith(`${prefix}signup`)) return fallback;
	return value;
}

/** 現在這一頁（路徑 + query），給 SessionProvider 帶到 login 的 next 用 */
export function currentPath(): string {
	return `${window.location.pathname}${window.location.search}`;
}

/** login 的網址；要回的不是 /home 才帶 next，網址乾淨一點 */
export function loginPath(locale: string, next: string): string {
	const home = `/${locale}/home`;
	return next === home ? `/${locale}/login` : `/${locale}/login?next=${encodeURIComponent(next)}`;
}
