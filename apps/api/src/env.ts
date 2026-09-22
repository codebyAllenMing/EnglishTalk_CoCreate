/**
 * 啟動時把環境變數收成一個型別化物件，缺哪個就在這裡炸、不要等到第一個請求才炸。
 * 值從哪來由啟動方式決定：dev 是 --env-file=.env.local，prod 是 Workers 的 secret / vars。
 */
export type Env = {
	DATABASE_URL: string;
	API_PORT: number;
	API_ORIGIN: string;
	/** 允許帶 cookie 打 API 的前端 origin，可以多個（逗號分隔）：localhost 之外還有手機測試用的區網 IP */
	WEB_ORIGINS: string[];
	BETTER_AUTH_SECRET: string;
	/** dev 走 https 用的憑證（PEM 路徑，相對 repo 根目錄）；兩個都給才開 https，不給就是 http（prod 的 Workers 不看這個） */
	TLS?: { cert: string; key: string };
};

export function loadEnv(source: Record<string, string | undefined>): Env {
	const required = (key: string): string => {
		const value = source[key];
		if (!value) {
			throw new Error(`缺少環境變數 ${key}，請對照 .env.example 補到 .env.local`);
		}
		return value;
	};

	const tlsCert = source.TLS_CERT;
	const tlsKey = source.TLS_KEY;
	if ((tlsCert && !tlsKey) || (!tlsCert && tlsKey)) throw new Error("TLS_CERT 與 TLS_KEY 要一起給");

	return {
		DATABASE_URL: required("DATABASE_URL"),
		API_PORT: Number(source.API_PORT ?? 4000),
		API_ORIGIN: required("API_ORIGIN"),
		WEB_ORIGINS: required("WEB_ORIGIN")
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean),
		BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
		TLS: tlsCert && tlsKey ? { cert: tlsCert, key: tlsKey } : undefined,
	};
}
