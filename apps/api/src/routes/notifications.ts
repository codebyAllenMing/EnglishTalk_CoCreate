import { and, countDistinct, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireUser, type Auth } from "@monstertalk/auth";
import { schema, type Db } from "@monstertalk/db";
import { notificationTypeCode, type NotificationTypeCode } from "@monstertalk/db/schema";

/** 鈴鐺清單的一則。type 是 code（前端拿它挑圖示），text 是 server 組好的整句 */
export type NotificationItem = {
	id: number;
	type: NotificationTypeCode;
	text: string;
	isRead: boolean;
	createDate: string;
};

export type NotificationList = { items: NotificationItem[]; unread: number };

/** 鈴鐺一次列這麼多則（去重後） */
const LIMIT = 30;

/**
 * 通知只有讀與標已讀，寫入在別處（房間路由、排程、auth hook、打招呼）。
 *
 *   GET  /api/me/notifications        最近 LIMIT 則（text 去重、留最新那列）+ 未讀數
 *   POST /api/me/notifications/read   打開鈴鐺：自己的未讀整批翻 true，204
 *
 * 去重：`distinct on (text)` 照 text、createDate desc 取每句最新的一列，再照 createDate 倒排。
 * 已讀是整批翻的，所以同一句話較新的那列未讀 ⇒ 舊的也未讀，拿最新那列的 isRead 就對。
 */
export function notificationsRoutes(auth: Auth, db: Db) {
	const app = new Hono();
	const guard = requireUser(auth);
	const n = schema.notifications;

	app.get("/me/notifications", guard, async (c) => {
		const me = c.var.user.id;
		const latest = db
			.selectDistinctOn([n.text], { id: n.id, type: n.type, text: n.text, isRead: n.isRead, createDate: n.createDate })
			.from(n)
			.where(eq(n.userId, me))
			.orderBy(n.text, desc(n.createDate))
			.as("latest");
		const [rows, unread] = await Promise.all([
			db.select().from(latest).orderBy(desc(latest.createDate)).limit(LIMIT),
			unreadCount(db, me),
		]);
		const items: NotificationItem[] = rows.map((r) => ({
			id: r.id,
			type: notificationTypeCode(r.type),
			text: r.text,
			isRead: r.isRead,
			createDate: r.createDate.toISOString(),
		}));
		const body: NotificationList = { items, unread };
		return c.json(body);
	});

	app.post("/me/notifications/read", guard, async (c) => {
		await db
			.update(n)
			.set({ isRead: true })
			.where(and(eq(n.userId, c.var.user.id), eq(n.isRead, false)));
		return c.body(null, 204);
	});

	return app;
}

/** 徽章數 = 未讀的不同句子數（心跳也回這個） */
export async function unreadCount(db: Db, userId: string): Promise<number> {
	const n = schema.notifications;
	const [row] = await db
		.select({ unread: countDistinct(n.text) })
		.from(n)
		.where(and(eq(n.userId, userId), eq(n.isRead, false)));
	return row?.unread ?? 0;
}
