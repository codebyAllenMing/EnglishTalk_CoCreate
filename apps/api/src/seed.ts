import { eq, like } from "drizzle-orm";
import { createAuth, isAPIError } from "@monstertalk/auth";
import { createDb, schema } from "@monstertalk/db";
import type { Country, Lang, Level, RoomDuration, RoomMemberStatus, RoomTypeId } from "@monstertalk/db/schema";
import { loadEnv } from "./env.ts";

/**
 * dev 測試帳號。11 個人對應前端 mock 的 11 隻怪獸（FAKE_PROFILE 的 allen + fakeMonsters.json 的十隻），
 * 語言 / 程度 / 自介照 mock 抄，之後 Find Monsters 接真資料時畫面不會變。
 *
 *   corepack pnpm db:seed          → 全部 <id>@example.com，密碼一律 1qaz@WSX
 *
 * 可重複執行：帳號已存在就跳過建立，**密碼與個人資料每次都覆寫回這裡的值**，
 * 所以在設定頁亂改（或改了密碼）之後想還原就重跑一次。
 * 房間（測週曆用）是相對「本週」排的，每次重跑先刪掉自己建的 SEED* 房再建；使用者自己開的房不動。
 * 建帳號走 better-auth 的 server-side API（auth.api.signUpEmail）而不是直接 insert，
 * 密碼 hash 與 Accounts 那一列才會跟真的註冊一模一樣；個人資料欄位 better-auth 不認識，用 Drizzle 直接 update。
 */
const PASSWORD = "1qaz@WSX";
const EXISTS_CODES = new Set(["USER_ALREADY_EXISTS", "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"]);

type SeedUser = {
	id: string;
	native: Lang;
	learning: Lang;
	level: Level;
	interests: string[];
	bio: string;
};

/** 頭像就是自己那隻（id = Avatars.code）；國家由母語推：zh → TW、en → US */
const SEED_USERS: readonly SeedUser[] = [
	{ id: "allen", native: "zh", learning: "en", level: "intermediate", interests: ["旅行", "電影", "音樂", "藝術", "健身"], bio: "I love language, boba tea, and weekend hikes. Let's chat about movies, travel, or daily life! 🌿" },
	{ id: "bobby", native: "en", learning: "zh", level: "intermediate", interests: ["Sports", "Gaming"], bio: "Basketball, indie games, and way too much coffee. Ask me about Chicago!" },
	{ id: "luna", native: "en", learning: "zh", level: "advanced", interests: ["Music", "Tech"], bio: "Music producer by night. I can talk about synths for hours 🎧" },
	{ id: "alex", native: "zh", learning: "en", level: "intermediate", interests: ["音樂", "科技", "美食"], bio: "Likes: music, tech, basketball, memes, and spicy food 🌶️" },
	{ id: "mia", native: "en", learning: "zh", level: "beginner", interests: ["Travel", "Food"], bio: "Learning Mandarin for my trip next spring. Be patient with me!" },
	{ id: "sunny", native: "zh", learning: "en", level: "beginner", interests: ["電影", "閱讀"], bio: "白天上班，晚上追劇。想練口說，聊什麼都可以！" },
	{ id: "tao", native: "zh", learning: "en", level: "advanced", interests: ["攝影", "旅行", "美食"], bio: "爬山、攝影、煮咖啡。最近在準備出國念書 ⛰️" },
	{ id: "yuki", native: "en", learning: "zh", level: "intermediate", interests: ["Reading", "Food"], bio: "Bookworm. Currently reading everything I can find about Taiwanese food." },
	{ id: "ryan", native: "en", learning: "zh", level: "beginner", interests: ["Fitness", "Pets"], bio: "Dad of two, weekend runner, terrible at tones but trying 🏃" },
	{ id: "nina", native: "zh", learning: "en", level: "intermediate", interests: ["藝術", "電影", "寵物"], bio: "設計師，喜歡貓和老電影。想找人一起練英文面試 🎬" },
	{ id: "leo", native: "en", learning: "zh", level: "advanced", interests: ["Travel", "Sports"], bio: "Been living in Taipei for 3 years. Happy to help with everyday English." },
];

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

const ctx = await auth.$context;
const avatarIds = new Map((await db.select().from(schema.avatars)).map((a) => [a.code, a.id]));

/** SEED_USERS 的 id → Users.id，建房間時要用 */
const userIds = new Map<string, string>();

let created = 0;
let skipped = 0;
for (const u of SEED_USERS) {
	const email = `${u.id}@example.com`;
	const name = u.id.charAt(0).toUpperCase() + u.id.slice(1);
	try {
		await auth.api.signUpEmail({ body: { name, email, password: PASSWORD } });
		created += 1;
		console.log(`+ ${email.padEnd(22)} ${name}`);
	} catch (error) {
		// 同一件事 better-auth 有兩個碼：HTTP 端點回 USER_ALREADY_EXISTS，server-side 呼叫回 ..._USE_ANOTHER_EMAIL
		if (isAPIError(error) && EXISTS_CODES.has(String(error.body?.code))) {
			skipped += 1;
			console.log(`= ${email.padEnd(22)} 已存在，密碼與個人資料重設`);
		} else {
			throw error;
		}
	}

	const [row] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email));
	if (!row) throw new Error(`${email} 建立後找不到`);
	userIds.set(u.id, row.id);
	// 密碼也重設：hash 用 better-auth 自己的（scrypt），存法跟註冊時一樣，登入才驗得過
	await ctx.internalAdapter.updatePassword(row.id, await ctx.password.hash(PASSWORD));

	const avatarId = avatarIds.get(u.id);
	if (!avatarId) throw new Error(`Avatars 目錄沒有 ${u.id}，先跑 db:migrate`);
	const country: Country = u.native === "zh" ? "TW" : "US";
	await db
		.update(schema.users)
		.set({
			name,
			avatarId,
			nativeLang: u.native,
			nativeLevel: "fluent",
			learningLang: u.learning,
			learningLevel: u.level,
			country,
			interests: u.interests,
			bio: u.bio,
			updateDate: new Date(),
		})
		.where(eq(schema.users.email, email));
}

console.log(`\n建立 ${created} 個、既有 ${skipped} 個，密碼與個人資料已寫入。密碼一律 ${PASSWORD}`);

// ---- 房間（測週曆用）----

type SeedRoom = {
	code: string;
	host: string;
	title: string;
	/** 相對本週週一的天數（可以是負的 = 上週、≥ 7 = 下週） */
	day: number;
	/** 當地時間 "HH:MM" */
	time: string;
	duration: RoomDuration;
	capacity: number;
	roomType: RoomTypeId;
	members: { id: string; status: RoomMemberStatus }[];
};

/** roomType：1 = en → zh、2 = zh → en。allen 視角：SEED01 / 05 是他開的，02 / 03 是他加入的，04 申請中（虛線卡），06–08 可加入（黃卡） */
const SEED_ROOMS: readonly SeedRoom[] = [
	{ code: "SEED01", host: "allen", title: "English practice", day: 1, time: "20:00", duration: 40, capacity: 2, roomType: 2, members: [{ id: "luna", status: "approved" }] },
	{ code: "SEED02", host: "bobby", title: "Small group room", day: 3, time: "21:00", duration: 60, capacity: 4, roomType: 1, members: [{ id: "allen", status: "approved" }, { id: "luna", status: "approved" }, { id: "mia", status: "requested" }] },
	{ code: "SEED03", host: "luna", title: "Movie night chat", day: 5, time: "19:00", duration: 60, capacity: 3, roomType: 1, members: [{ id: "allen", status: "approved" }] },
	{ code: "SEED04", host: "alex", title: "Weekly check-in", day: 9, time: "20:00", duration: 20, capacity: 2, roomType: 2, members: [{ id: "allen", status: "requested" }] },
	{ code: "SEED05", host: "allen", title: "Quick chat", day: -4, time: "12:00", duration: 20, capacity: 2, roomType: 2, members: [] },
	// 下面兩間沒有 allen：從 allen 的視角是黃色「可加入」；週六 10:00 那兩間重疊，會併成一張卡
	{ code: "SEED06", host: "nina", title: "面試英文練習", day: 4, time: "20:00", duration: 40, capacity: 3, roomType: 2, members: [] },
	{ code: "SEED07", host: "tao", title: "Coffee chat", day: 5, time: "10:00", duration: 60, capacity: 4, roomType: 2, members: [{ id: "sunny", status: "approved" }] },
	{ code: "SEED08", host: "yuki", title: "Taiwanese food talk", day: 5, time: "10:30", duration: 40, capacity: 2, roomType: 1, members: [] },
];

// 本週週一 00:00（本機時區）。getDay() 週日是 0，所以週日要往回推 6 天
const today = new Date();
const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
function at(day: number, time: string): Date {
	const [h = 0, m = 0] = time.split(":").map(Number);
	return new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + day, h, m);
}

await db.delete(schema.rooms).where(like(schema.rooms.code, "SEED%"));
for (const r of SEED_ROOMS) {
	const hostId = userIds.get(r.host);
	if (!hostId) throw new Error(`SEED_ROOMS 的 host ${r.host} 不在 SEED_USERS 裡`);
	const startDate = at(r.day, r.time);
	const endDate = new Date(startDate.getTime() + r.duration * 60_000);
	const [room] = await db
		.insert(schema.rooms)
		.values({ code: r.code, hostId, title: r.title, startDate, endDate, durationMinutes: r.duration, capacity: r.capacity, roomType: r.roomType })
		.returning({ id: schema.rooms.id });
	if (!room) throw new Error(`${r.code} insert 沒有回傳列`);
	await db.insert(schema.roomMembers).values([
		{ roomId: room.id, userId: hostId, role: "host", status: "approved" },
		...r.members.map((m) => {
			const userId = userIds.get(m.id);
			if (!userId) throw new Error(`SEED_ROOMS 的成員 ${m.id} 不在 SEED_USERS 裡`);
			return { roomId: room.id, userId, role: "member", status: m.status };
		}),
	]);
	console.log(`+ ${r.code} ${r.host.padEnd(6)} ${startDate.toLocaleString("zh-TW")}  ${r.duration} 分  ${r.title || "(無標題)"}`);
}
console.log(`房間 ${SEED_ROOMS.length} 間已重建（相對本週）。`);
process.exit(0);
