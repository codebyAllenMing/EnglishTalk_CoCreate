import { defineConfig } from "drizzle-kit";

// 連線字串跟 api 共用同一份 repo 根目錄的 .env.local。
// drizzle-kit 只會自己讀 cwd 的 .env，不讀 .env.local，所以這裡手動載入（Node 21.7+ 內建，不需要 dotenv）。
process.loadEnvFile("../../.env.local");

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema/index.ts",
	out: "./drizzle",
	dbCredentials: {
		url: process.env.DATABASE_URL!,
	},
});
