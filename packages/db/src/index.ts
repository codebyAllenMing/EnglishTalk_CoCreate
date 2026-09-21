import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

/**
 * 建一個 Drizzle 連線。呼叫端（api）決定 URL 從哪來，這裡不讀環境變數。
 *
 * dev 用 postgres-js（TCP）連本機 Docker；prod 上 Workers 時連 Neon 要換 HTTP driver
 * （drizzle-orm/neon-http），只動這個檔案，schema 與查詢碼不變。
 */
export function createDb(url: string) {
	const client = postgres(url);
	return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
export { schema };
