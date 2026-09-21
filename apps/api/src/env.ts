/**
 * 啟動時把環境變數收成一個型別化物件，缺哪個就在這裡炸、不要等到第一個請求才炸。
 * 值從哪來由啟動方式決定：dev 是 --env-file=.env.local，prod 是 Workers 的 secret / vars。
 */
export type Env = {
	DATABASE_URL: string;
	API_PORT: number;
	API_ORIGIN: string;
	WEB_ORIGIN: string;
	BETTER_AUTH_SECRET: string;
};

export function loadEnv(source: Record<string, string | undefined>): Env {
	const required = (key: keyof Env): string => {
		const value = source[key];
		if (!value) {
			throw new Error(`缺少環境變數 ${key}，請對照 .env.example 補到 .env.local`);
		}
		return value;
	};

	return {
		DATABASE_URL: required("DATABASE_URL"),
		API_PORT: Number(source.API_PORT ?? 4000),
		API_ORIGIN: required("API_ORIGIN"),
		WEB_ORIGIN: required("WEB_ORIGIN"),
		BETTER_AUTH_SECRET: required("BETTER_AUTH_SECRET"),
	};
}
