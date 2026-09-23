import { and, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import { schema, type Db } from "@monstertalk/db";
import { ROOM_ENTRY_LEAD_MINUTES } from "@monstertalk/db/schema";
import { notify } from "./notify.ts";

const TICK_MS = 60_000;

type Options = {
	log: (message: string) => void;
	onError: (error: unknown, context?: Record<string, unknown>) => void;
};

/**
 * 時間到的通知：每分鐘掃一次 Rooms，寫「要開始了」（開始前 ROOM_ENTRY_LEAD_MINUTES 分鐘，
 * 跟進房窗同一個數字，點了鈴鐺就能進房）與「結束了」。
 *
 * 每次只看 (上一次掃到的時間, 現在] 這個窗，房的觸發點落在窗內才寫，所以正常情況一間房只寫一次；
 * api 重啟時窗從「現在」開始，停機期間該發的就跳過（通知只是訊息，補發一個過期的沒意義）。
 * 就算重疊寫了兩次也沒關係，讀的時候 text 去重。單機 setInterval 夠用；搬 Workers 換 Cron Trigger，掃描的碼不變。
 */
export function startReminders(db: Db, { log, onError }: Options): () => void {
	let since = new Date();

	const tick = async () => {
		const until = new Date();
		const window = { since, until };
		since = until;
		const lead = ROOM_ENTRY_LEAD_MINUTES * 60_000;
		try {
			// 開始前 N 分鐘的那一刻落在窗內：startDate ∈ (since + N, until + N]
			const starting = await roomsWithMembers(db, {
				after: new Date(window.since.getTime() + lead),
				until: new Date(window.until.getTime() + lead),
				column: "startDate",
			});
			for (const room of starting) await notify(db, room.members, "roomStarting", { room });
			const ended = await roomsWithMembers(db, { after: window.since, until: window.until, column: "endDate" });
			for (const room of ended) await notify(db, room.members, "roomEnded", { room });
			if (starting.length || ended.length) log(`reminders: starting ${starting.length}, ended ${ended.length}`);
		} catch (error) {
			onError(error, { since: window.since.toISOString(), until: window.until.toISOString() });
		}
	};

	const timer = setInterval(() => void tick(), TICK_MS);
	return () => clearInterval(timer);
}

type RoomWithMembers = { title: string; startDate: Date; members: string[] };

/** 未取消、指定欄位落在 (after, until] 的房，附 approved 成員（含房主） */
async function roomsWithMembers(
	db: Db,
	{ after, until, column }: { after: Date; until: Date; column: "startDate" | "endDate" },
): Promise<RoomWithMembers[]> {
	const col = schema.rooms[column];
	const rooms = await db
		.select({ id: schema.rooms.id, title: schema.rooms.title, startDate: schema.rooms.startDate })
		.from(schema.rooms)
		.where(and(isNull(schema.rooms.cancelDate), gt(col, after), lte(col, until)));
	if (!rooms.length) return [];
	const members = await db
		.select({ roomId: schema.roomMembers.roomId, userId: schema.roomMembers.userId })
		.from(schema.roomMembers)
		.where(
			and(
				inArray(
					schema.roomMembers.roomId,
					rooms.map((r) => r.id),
				),
				eq(schema.roomMembers.status, "approved"),
			),
		);
	return rooms.map((r) => ({
		title: r.title,
		startDate: r.startDate,
		members: members.filter((m) => m.roomId === r.id).map((m) => m.userId),
	}));
}
