import { and, eq, inArray } from "drizzle-orm";
import { schema, type Db } from "@monstertalk/db";
import { ROOM_ENTRY_LEAD_MINUTES } from "@monstertalk/db/schema";

export type RoomRow = typeof schema.rooms.$inferSelect;

export type RoomAccess =
	| { ok: true; room: RoomRow; role: "host" | "member" }
	| { ok: false; reason: "notFound" | "cancelled" | "notMember" | "notStarted" | "ended"; room?: RoomRow };

/**
 * 「這個人現在能不能進這間房」—— 房間頁面、白板 / 聊天的 WS 握手、LiveKit 簽 token 全部走這一個函式，
 * 規則只寫一次：房存在、沒取消、他在子單且 approved（房主那列也是）、時間窗 `startDate − 5 分鐘 ~ endDate`。
 *
 * ⚠️ 這是安全層。頁面那層的判斷擋不住直接開 WS 或直接打 token API 的人，每個入口都要呼叫這個。
 */
export async function roomAccess(db: Db, userId: string, code: string, now = new Date()): Promise<RoomAccess> {
	const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.code, code)).limit(1);
	if (!room) return { ok: false, reason: "notFound" };
	if (room.cancelDate) return { ok: false, reason: "cancelled", room };

	const [member] = await db
		.select({ role: schema.roomMembers.role })
		.from(schema.roomMembers)
		.where(
			and(
				eq(schema.roomMembers.roomId, room.id),
				eq(schema.roomMembers.userId, userId),
				inArray(schema.roomMembers.status, ["approved"]),
			),
		)
		.limit(1);
	if (!member) return { ok: false, reason: "notMember", room };

	const opensAt = room.startDate.getTime() - ROOM_ENTRY_LEAD_MINUTES * 60_000;
	if (now.getTime() < opensAt) return { ok: false, reason: "notStarted", room };
	if (now.getTime() >= room.endDate.getTime()) return { ok: false, reason: "ended", room };

	return { ok: true, room, role: member.role === "host" ? "host" : "member" };
}
