import { inArray } from "drizzle-orm";
import { schema, type Db } from "@monstertalk/db";
import {
	ROOM_ENTRY_LEAD_MINUTES,
	notificationTypeId,
	type Lang,
	type NotificationTypeCode,
} from "@monstertalk/db/schema";

/** 交易或連線都能傳進來 */
type Queryable = Pick<Db, "select" | "insert">;

/** 模板要的變數；各 type 用自己需要的那幾個 */
export type NotifyParams = {
	room?: { title: string; startDate: Date };
	/** 做這件事的人（申請者、房主、打招呼的人） */
	actor?: { name: string };
	/** 指定語言，不查收件人的母語（註冊時個人資料還是預設值，用 Accept-Language 推） */
	lang?: Lang;
};

type Template = (p: NotifyParams, f: Formatters) => string;
type Formatters = { title: (p: NotifyParams) => string; time: (p: NotifyParams) => string; actor: (p: NotifyParams) => string };

/**
 * 每個 type 一組 zh / en 模板。**整句就是去重的 key**（讀的時候 `distinct on (text)`），
 * 所以只放房名、時間、人名這種同一件事每次都一樣的東西。改文案改這裡就好，DB 不用動。
 */
const TEMPLATES: Record<NotificationTypeCode, Record<Lang, Template>> = {
	roomCreated: {
		zh: (p, f) => `你開了「${f.title(p)}」，${f.time(p)} 開始`,
		en: (p, f) => `You opened "${f.title(p)}", starts ${f.time(p)}`,
	},
	roomStarting: {
		zh: (p, f) => `「${f.title(p)}」${ROOM_ENTRY_LEAD_MINUTES} 分鐘後開始（${f.time(p)}）`,
		en: (p, f) => `"${f.title(p)}" starts in ${ROOM_ENTRY_LEAD_MINUTES} minutes (${f.time(p)})`,
	},
	joinRequested: {
		zh: (p, f) => `${f.actor(p)} 申請加入「${f.title(p)}」`,
		en: (p, f) => `${f.actor(p)} asked to join "${f.title(p)}"`,
	},
	joinApproved: {
		zh: (p, f) => `${f.actor(p)} 同意你加入「${f.title(p)}」`,
		en: (p, f) => `${f.actor(p)} approved you for "${f.title(p)}"`,
	},
	joinRejected: {
		zh: (p, f) => `${f.actor(p)} 婉拒了你加入「${f.title(p)}」`,
		en: (p, f) => `${f.actor(p)} declined your request for "${f.title(p)}"`,
	},
	roomCancelled: {
		zh: (p, f) => `${f.actor(p)} 取消了「${f.title(p)}」（${f.time(p)}）`,
		en: (p, f) => `${f.actor(p)} cancelled "${f.title(p)}" (${f.time(p)})`,
	},
	memberLeft: {
		zh: (p, f) => `${f.actor(p)} 退出了「${f.title(p)}」`,
		en: (p, f) => `${f.actor(p)} left "${f.title(p)}"`,
	},
	roomEnded: {
		zh: (p, f) => `「${f.title(p)}」結束了`,
		en: (p, f) => `"${f.title(p)}" has ended`,
	},
	greeting: {
		zh: (p, f) => `${f.actor(p)} 跟你打了聲招呼`,
		en: (p, f) => `${f.actor(p)} said hi`,
	},
	welcome: {
		zh: () => "歡迎加入 MonsterTalk，先開一間房或找隻怪獸聊聊吧",
		en: () => "Welcome to MonsterTalk. Open a room or find a monster to talk to",
	},
};

/** 無標題的房跟前端字典的 `schedule.untitled` 同一個字 */
const UNTITLED: Record<Lang, string> = { zh: "聊天室", en: "Room" };

/** 時間一律台灣時區、M/d HH:mm（使用者 2026-09-23：先這樣，兩邊的人都在台灣看） */
const TIME_FORMAT: Record<Lang, Intl.DateTimeFormat> = {
	zh: new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }),
	en: new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }),
};

function formatters(lang: Lang): Formatters {
	return {
		title: (p) => p.room?.title || UNTITLED[lang],
		time: (p) => (p.room ? TIME_FORMAT[lang].format(p.room.startDate) : ""),
		actor: (p) => p.actor?.name ?? "",
	};
}

export function renderNotification(code: NotificationTypeCode, lang: Lang, params: NotifyParams): string {
	return TEMPLATES[code][lang](params, formatters(lang));
}

/**
 * 寫通知：依每個收件人的母語組一句話、一次插入。呼叫端在交易裡就傳 tx，狀態改了通知一定有。
 * 收件人空的就不查不寫。不查重 —— 重複是允許的，讀的時候去。
 */
export async function notify(
	q: Queryable,
	recipients: string | readonly string[],
	code: NotificationTypeCode,
	params: NotifyParams = {},
): Promise<void> {
	const ids = [...new Set(typeof recipients === "string" ? [recipients] : recipients)];
	if (!ids.length) return;
	const type = notificationTypeId(code);
	const langs = new Map<string, Lang>();
	if (!params.lang) {
		const rows = await q
			.select({ id: schema.users.id, nativeLang: schema.users.nativeLang })
			.from(schema.users)
			.where(inArray(schema.users.id, ids));
		for (const r of rows) langs.set(r.id, r.nativeLang === "en" ? "en" : "zh");
	}
	const values = ids.map((userId) => {
		const lang = params.lang ?? langs.get(userId) ?? "zh";
		return { userId, type, text: renderNotification(code, lang, params) };
	});
	await q.insert(schema.notifications).values(values);
}
