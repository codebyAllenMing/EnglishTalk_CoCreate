import { and, count, eq, gt, inArray, isNull, lt } from "drizzle-orm";
import { Hono } from "hono";
import { requireUser, type Auth } from "@monstertalk/auth";
import { schema, type Db } from "@monstertalk/db";
import {
	ROOM_CAPACITY_MAX,
	ROOM_CAPACITY_MIN,
	ROOM_DURATIONS,
	ROOM_TITLE_MAX,
	ROOM_TYPES,
	type Lang,
	type RoomDuration,
	type RoomTypeId,
} from "@monstertalk/db/schema";

export type ScheduleKind = "hosted" | "session";

/**
 * 週曆的一張卡：我開的（hosted）或我加入且房主已同意的（session）房。
 * 時間是 ISO（UTC），前端自己換成當地的日期與分鐘；from / to 是 roomType 展開後的語言碼，
 * 前端不用知道 enum id。
 */
export type ScheduleItem = {
	id: number;
	code: string;
	kind: ScheduleKind;
	title: string;
	startDate: string;
	endDate: string;
	durationMinutes: RoomDuration;
	capacity: number;
	seats: { taken: number; total: number };
	from: Lang;
	to: Lang;
};

/** POST /api/rooms 的 body。endDate 不收，server 由 startDate + durationMinutes 算 */
export type RoomInput = {
	title: string;
	startDate: string;
	durationMinutes: RoomDuration;
	capacity: number;
	roomType: RoomTypeId;
};

/** 房號字母表：去掉 0 / O / 1 / I，唸出來或抄下來都不會混。32 個字剛好整除 256，取餘沒有偏差 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const CODE_ATTEMPTS = 5;

/**
 * 房間：GET /api/me/schedule?from&to、POST /api/rooms。
 *
 * 週曆與 Find Monsters 都是 Rooms + RoomMembers 的投影，這裡只回「我有份的」；
 * 別人的房（申請加入用）之後另開 GET /api/rooms。
 *
 * 開房是一筆交易：檢查跟我其他房不重疊 → 插主單 → 插房主那列子單（role host、status approved）。
 * 重疊檢查放 app 層而不做 DB 的 exclusion constraint（drizzle 要 raw SQL，發表前不值得）。
 * 取消 / 申請 / 審核都還沒有，等下一輪。
 */
export function roomsRoutes(auth: Auth, db: Db) {
	const app = new Hono();
	const guard = requireUser(auth);

	app.get("/me/schedule", guard, async (c) => {
		const from = parseDate(c.req.query("from"));
		const to = parseDate(c.req.query("to"));
		if (!from || !to || from >= to) return c.json({ error: "invalid", field: "range" }, 400);

		const rows = await db
			.select({ room: schema.rooms, role: schema.roomMembers.role })
			.from(schema.roomMembers)
			.innerJoin(schema.rooms, eq(schema.roomMembers.roomId, schema.rooms.id))
			.where(and(mine(c.var.user.id), overlapping(from, to)))
			.orderBy(schema.rooms.startDate);
		const taken = await seatsTaken(
			db,
			rows.map((r) => r.room.id),
		);
		const items: ScheduleItem[] = rows.map((r) =>
			toItem(r.room, r.role === "host" ? "hosted" : "session", taken.get(r.room.id) ?? 0),
		);
		return c.json(items);
	});

	app.post("/rooms", guard, async (c) => {
		const body: unknown = await c.req.json().catch(() => null);
		const parsed = parseRoomInput(body);
		if (!parsed.ok) return c.json({ error: "invalid", field: parsed.field }, 400);
		const me = c.var.user.id;
		const { input, start, end } = parsed;

		const code = await freeCode(db);
		const room = await db.transaction(async (tx) => {
			const clash = await tx
				.select({ id: schema.rooms.id })
				.from(schema.roomMembers)
				.innerJoin(schema.rooms, eq(schema.roomMembers.roomId, schema.rooms.id))
				.where(and(mine(me), overlapping(start, end)))
				.limit(1);
			if (clash.length) return null;

			const inserted = await tx
				.insert(schema.rooms)
				.values({
					code,
					hostId: me,
					title: input.title,
					startDate: start,
					endDate: end,
					durationMinutes: input.durationMinutes,
					capacity: input.capacity,
					roomType: input.roomType,
				})
				.returning();
			const created = inserted[0];
			if (!created) throw new Error("insert Rooms 沒有回傳列");
			await tx
				.insert(schema.roomMembers)
				.values({ roomId: created.id, userId: me, role: "host", status: "approved" });
			return created;
		});
		if (!room) return c.json({ error: "overlap" }, 409);
		return c.json(toItem(room, "hosted", 1), 201);
	});

	return app;
}

/** 我是 approved 成員（房主那列也是 approved）、房沒取消 */
function mine(userId: string) {
	return and(
		eq(schema.roomMembers.userId, userId),
		eq(schema.roomMembers.status, "approved"),
		isNull(schema.rooms.cancelDate),
	);
}

/** 房跟 [from, to) 有交集。同一條式子拿來查週曆，也拿來擋重疊 */
function overlapping(from: Date, to: Date) {
	return and(lt(schema.rooms.startDate, to), gt(schema.rooms.endDate, from));
}

/** 各房已同意的人數（含房主） */
async function seatsTaken(db: Db, roomIds: number[]): Promise<Map<number, number>> {
	if (!roomIds.length) return new Map();
	const rows = await db
		.select({ roomId: schema.roomMembers.roomId, taken: count() })
		.from(schema.roomMembers)
		.where(and(inArray(schema.roomMembers.roomId, roomIds), eq(schema.roomMembers.status, "approved")))
		.groupBy(schema.roomMembers.roomId);
	return new Map(rows.map((r) => [r.roomId, r.taken]));
}

type RoomRow = typeof schema.rooms.$inferSelect;

function toItem(room: RoomRow, kind: ScheduleKind, taken: number): ScheduleItem {
	const type = ROOM_TYPES.find((t) => t.id === room.roomType);
	if (!type) throw new Error(`Rooms.roomType ${room.roomType} 不在 ROOM_TYPES 裡`);
	return {
		id: room.id,
		code: room.code,
		kind,
		title: room.title,
		startDate: room.startDate.toISOString(),
		endDate: room.endDate.toISOString(),
		durationMinutes: room.durationMinutes as RoomDuration,
		capacity: room.capacity,
		seats: { taken, total: room.capacity },
		from: type.from,
		to: type.to,
	};
}

/** 產一個沒用過的房號。unique index 是最後防線；這裡先查一次，撞到就重抽 */
async function freeCode(db: Db): Promise<string> {
	for (let i = 0; i < CODE_ATTEMPTS; i += 1) {
		const code = newCode();
		const hit = await db.select({ id: schema.rooms.id }).from(schema.rooms).where(eq(schema.rooms.code, code)).limit(1);
		if (!hit.length) return code;
	}
	throw new Error("房號連撞五次，32^6 的空間不該發生");
}

function newCode(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
	return Array.from(bytes, (b) => CODE_ALPHABET.charAt(b % CODE_ALPHABET.length)).join("");
}

function parseDate(value: string | undefined): Date | null {
	if (!value) return null;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

type Parsed = { ok: true; input: RoomInput; start: Date; end: Date } | { ok: false; field: string };

/** 手寫驗證，400 帶第一個錯的欄位名（跟 profile 同一套） */
function parseRoomInput(body: unknown): Parsed {
	if (typeof body !== "object" || body === null) return { ok: false, field: "body" };
	const b = body as Record<string, unknown>;

	const title = typeof b.title === "string" ? b.title.trim() : "";
	if (title.length > ROOM_TITLE_MAX) return { ok: false, field: "title" };

	// 整分（秒與毫秒為 0）且在未來。:00 / :30 的粒度由前端的選單保證 —— server 不碰時區，
	// 用 UTC 的分鐘去卡 :00 / :30 在半小時時差的地方會誤判
	const start = typeof b.startDate === "string" ? parseDate(b.startDate) : null;
	if (!start || start.getTime() % 60_000 !== 0 || start.getTime() <= Date.now()) {
		return { ok: false, field: "startDate" };
	}

	const { durationMinutes, capacity, roomType } = b;
	if (!isDuration(durationMinutes)) return { ok: false, field: "durationMinutes" };
	if (
		typeof capacity !== "number" ||
		!Number.isInteger(capacity) ||
		capacity < ROOM_CAPACITY_MIN ||
		capacity > ROOM_CAPACITY_MAX
	) {
		return { ok: false, field: "capacity" };
	}
	if (!isRoomType(roomType)) return { ok: false, field: "roomType" };

	const end = new Date(start.getTime() + durationMinutes * 60_000);
	return {
		ok: true,
		input: { title, startDate: start.toISOString(), durationMinutes, capacity, roomType },
		start,
		end,
	};
}

const isDuration = (v: unknown): v is RoomDuration => (ROOM_DURATIONS as readonly unknown[]).includes(v);
const isRoomType = (v: unknown): v is RoomTypeId => ROOM_TYPES.some((t) => t.id === v);
