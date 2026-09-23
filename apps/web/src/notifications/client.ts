import { apiUrl } from "@/api";

/** 跟 apps/api 的 routes/notifications.ts 同形狀。text 是 server 組好的整句，前端不組字 */
export type NotificationType =
	| "roomCreated"
	| "roomStarting"
	| "joinRequested"
	| "joinApproved"
	| "joinRejected"
	| "roomCancelled"
	| "memberLeft"
	| "roomEnded"
	| "greeting"
	| "welcome";

export type NotificationItem = {
	id: number;
	type: NotificationType;
	text: string;
	isRead: boolean;
	/** ISO 字串 */
	createDate: string;
};

export type NotificationList = { items: NotificationItem[]; unread: number };

/** 最近的通知（server 已去重）+ 未讀數；失敗回 null 讓鈴鐺顯示錯誤而不是空的 */
export async function getNotifications(): Promise<NotificationList | null> {
	try {
		const response = await fetch(apiUrl("/api/me/notifications"), { credentials: "include" });
		if (!response.ok) return null;
		return response.json();
	} catch {
		return null;
	}
}

/** 打開鈴鐺那一刻：自己的未讀整批標已讀。失敗不管 —— 下一次心跳徽章會再對一次 */
export async function markNotificationsRead(): Promise<void> {
	await fetch(apiUrl("/api/me/notifications/read"), { method: "POST", credentials: "include" }).catch(() => undefined);
}

/** 打聲招呼：給對方一則通知。true = 送出了 */
export async function greetUser(userId: string): Promise<boolean> {
	try {
		const response = await fetch(apiUrl(`/api/users/${encodeURIComponent(userId)}/greet`), {
			method: "POST",
			credentials: "include",
		});
		return response.ok;
	} catch {
		return false;
	}
}
