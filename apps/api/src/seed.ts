import { createAuth, isAPIError } from "@monstertalk/auth";
import { createDb } from "@monstertalk/db";
import { loadEnv } from "./env.ts";

/**
 * dev 測試帳號。名字對應前端 mock 的 11 隻怪獸（FAKE_PROFILE 的 allen + fakeMonsters.json 的十隻），
 * 之後個人資料欄位進 DB 時，這份就是要填進去的人。
 *
 *   corepack pnpm db:seed          → 全部 <id>@example.com，密碼一律 password123
 *
 * 可重複執行：已存在的 email 跳過，不會改密碼、不會刪任何東西。
 * 走 better-auth 的 server-side API（auth.api.signUpEmail）而不是直接 insert，
 * 密碼 hash 與 Accounts 那一列才會跟真的註冊一模一樣。
 */
const PASSWORD = "password123";
const EXISTS_CODES = new Set(["USER_ALREADY_EXISTS", "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"]);
const SEED_USERS = ["allen", "bobby", "luna", "alex", "mia", "sunny", "tao", "yuki", "ryan", "nina", "leo"] as const;

const env = loadEnv(process.env);

// 只准打本機 —— 這些密碼是公開的，跑到 Neon 上等於開後門。真的要就自己拿掉這行。
if (!/localhost|127\.0\.0\.1/.test(env.DATABASE_URL)) {
	throw new Error(`db:seed 只允許本機資料庫，現在的 DATABASE_URL 不是：${env.DATABASE_URL}`);
}

const db = createDb(env.DATABASE_URL);
const auth = createAuth({
	db,
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.API_ORIGIN,
	trustedOrigins: [env.WEB_ORIGIN],
});

let created = 0;
let skipped = 0;
for (const id of SEED_USERS) {
	const email = `${id}@example.com`;
	const name = id.charAt(0).toUpperCase() + id.slice(1);
	try {
		await auth.api.signUpEmail({ body: { name, email, password: PASSWORD } });
		created += 1;
		console.log(`+ ${email.padEnd(22)} ${name}`);
	} catch (error) {
		// 同一件事 better-auth 有兩個碼：HTTP 端點回 USER_ALREADY_EXISTS，server-side 呼叫回 ..._USE_ANOTHER_EMAIL
		if (isAPIError(error) && EXISTS_CODES.has(String(error.body?.code))) {
			skipped += 1;
			console.log(`= ${email.padEnd(22)} 已存在，跳過`);
			continue;
		}
		throw error;
	}
}

console.log(`\n建立 ${created} 個、跳過 ${skipped} 個。密碼一律 ${PASSWORD}`);
process.exit(0);
