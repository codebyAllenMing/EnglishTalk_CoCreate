import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Db } from "@monstertalk/db";
import { schema } from "@monstertalk/db";

export type AuthOptions = {
	db: Db;
	/** 簽 session cookie 的金鑰；dev / prod 各一把，一律從環境變數來 */
	secret: string;
	/** API 自己的 origin，例如 http://localhost:4000；better-auth 用它決定 cookie 的 secure 與 callback */
	baseURL: string;
	/** 允許帶 cookie 打進來的前端 origin */
	trustedOrigins: string[];
	/**
	 * 使用者建好之後（註冊那一筆 insert 完）呼叫；acceptLanguage 是註冊請求的 Accept-Language，
	 * 個人資料這時還是預設值，要猜他看哪一語只能靠這個。這裡丟出的錯不會讓註冊失敗，呼叫端自己留痕。
	 */
	onUserCreated?: (user: { id: string; name: string }, request: { acceptLanguage: string | null }) => Promise<void>;
};

/**
 * 整個系統唯一的 better-auth 實例由這裡建。
 * api 的 /api/auth/* 交給 auth.handler；其他服務（WS 握手、tldraw、房間服務簽 LiveKit token）
 * 只需要 verifySession —— 都吃同一張 cookie。
 */
/** 四張表都有的兩欄，better-auth 名 → DB 欄位名 */
const TIMESTAMPS = { createdAt: "createDate", updatedAt: "updateDate" } as const;

export function createAuth({ db, secret, baseURL, trustedOrigins, onUserCreated }: AuthOptions) {
	return betterAuth({
		secret,
		baseURL,
		trustedOrigins,
		databaseHooks: {
			user: {
				create: {
					after: async (user, ctx) => {
						if (!onUserCreated) return;
						await onUserCreated(user, { acceptLanguage: ctx?.headers?.get("accept-language") ?? null });
					},
				},
			},
		},
		database: drizzleAdapter(db, {
			provider: "pg",
			// key 要對上下面各 modelName，adapter 用 modelName 來這張表找 Drizzle table
			schema: {
				Users: schema.users,
				Sessions: schema.sessions,
				Accounts: schema.accounts,
				Verifications: schema.verifications,
			},
		}),
		// 表名走專案慣例（PascalCase 複數）；時間欄位走使用者慣例 xxxDate，
		// 用 fields 把 better-auth 的 xxxAt 對到 DB 的欄位名（key 是 better-auth 的名字、value 是 DB 的）。
		// API 回傳給前端的 user / session 仍是 better-auth 的名字（createdAt），只有 DB 那層不同。
		user: { modelName: "Users", fields: TIMESTAMPS },
		session: {
			modelName: "Sessions",
			fields: { ...TIMESTAMPS, expiresAt: "expireDate" },
			// 「短效 access + refresh」在 better-auth 的對應：
			// cookie 內快取一份簽過名的 session 五分鐘，期間不查 DB；過期才回 DB 驗 Sessions 那一列
			cookieCache: { enabled: true, maxAge: 5 * 60 },
		},
		account: {
			modelName: "Accounts",
			fields: {
				...TIMESTAMPS,
				accessTokenExpiresAt: "accessTokenExpireDate",
				refreshTokenExpiresAt: "refreshTokenExpireDate",
			},
		},
		verification: { modelName: "Verifications", fields: { ...TIMESTAMPS, expiresAt: "expireDate" } },
		emailAndPassword: {
			enabled: true,
			// MVP 先不做 email 驗證與密碼重設（見 .claude/memory/auth-backend-plan.md）
			requireEmailVerification: false,
		},
	});
}

export type Auth = ReturnType<typeof createAuth>;
export type SessionData = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>;
export type User = SessionData["user"];
export type Session = SessionData["session"];

/**
 * 從請求 headers（裡面的 cookie）驗出目前使用者；沒登入回 null。
 * 給非 Hono 的入口用（WebSocket upgrade、tldraw sync 連線驗證）。
 */
export function verifySession(auth: Auth, headers: Headers): Promise<SessionData | null> {
	return auth.api.getSession({ headers });
}
