import { apiUrl } from "@/api";

/**
 * 登入 / 註冊的前端呼叫。只包 fetch，不裝 better-auth 的 client 套件 ——
 * 兩支端點、一顆 httpOnly cookie，沒有東西需要 client 端的 session store。
 *
 * ⚠️ credentials: "include" 不能少。前端 6531 打 API 4000 是跨 origin（同 site），
 *    少了它瀏覽器不會收 Set-Cookie、之後也不會帶 cookie；後端的 CORS 已對應開了 credentials。
 *
 * 端點與錯誤碼是 better-auth 的：
 *   POST /api/auth/sign-in/email  { email, password }
 *   POST /api/auth/sign-up/email  { name, email, password }   成功後自動登入
 * 失敗時 body 是 { code, message }，這裡只把 UI 會分開處理的幾個碼留下，其餘歸 unknown。
 */
export type AuthErrorCode = "invalidCredentials" | "emailTaken" | "passwordTooShort" | "network" | "unknown";

export type AuthResult = { ok: true } | { ok: false; code: AuthErrorCode };

const CODE_MAP: Record<string, AuthErrorCode> = {
	INVALID_EMAIL_OR_PASSWORD: "invalidCredentials",
	USER_ALREADY_EXISTS: "emailTaken",
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "emailTaken",
	PASSWORD_TOO_SHORT: "passwordTooShort",
};

async function post(path: string, body: Record<string, string>): Promise<AuthResult> {
	let response: Response;
	try {
		response = await fetch(apiUrl(path), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify(body),
		});
	} catch {
		// DNS / 連線被拒 / CORS 擋下都會走到這裡，fetch 只有網路層失敗才 throw
		return { ok: false, code: "network" };
	}

	if (response.ok) return { ok: true };

	const data: unknown = await response.json().catch(() => null);
	const code = typeof data === "object" && data !== null && "code" in data ? String(data.code) : "";
	return { ok: false, code: CODE_MAP[code] ?? "unknown" };
}

export const signIn = (email: string, password: string) =>
	post("/api/auth/sign-in/email", { email, password });

export const signUp = (name: string, email: string, password: string) =>
	post("/api/auth/sign-up/email", { name, email, password });
