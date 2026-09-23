import { and, count, eq, gt, inArray, isNull, lt, ne, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Hono } from "hono";
import { requireUser, type Auth } from "@monstertalk/auth";
import { schema, type Db } from "@monstertalk/db";
import {
	ROOM_ENTRY_LEAD_MINUTES,
	ROOM_CAPACITY_MAX,
	ROOM_CAPACITY_MIN,
	ROOM_DURATIONS,
	ROOM_LEAD_MINUTES,
	ROOM_TITLE_MAX,
	ROOM_TYPES,
	type Lang,
	type RoomDuration,
	type RoomTypeId,
} from "@monstertalk/db/schema";
import { notify } from "../notify.ts";
import { roomAccess } from "../rooms/access.ts";

export type ScheduleKind = "hosted" | "session";
/** 我跟這間房的關係：approved = 已加入（房主也是）、requested = 申請中等房主 */
export type MemberStatus = "approved" | "requested";

/**
 * 週曆的一張卡：我開的（hosted）、我加入的或申請中的（session）房。
 * 時間是 ISO（UTC），前端自己換成當地的日期與分鐘；from / to 是 roomType 展開後的語言碼，
 * 前端不用知道 enum id。seats.taken 只算 approved。
 */
export type ScheduleItem = {
	id: number;
	code: string;
	kind: ScheduleKind;
	status: MemberStatus;
	title: string;
	startDate: string;
	endDate: string;
	durationMinutes: RoomDuration;
	capacity: number;
	seats: { taken: number; total: number };
	from: Lang;
	to: Lang;
};

export type RoomMember = { id: string; name: string; avatar: string; role: "host" | "member" };

/**
 * GET /api/rooms/:code：卡片詳情打開時才拉。任何登入的人都能看未取消的房（申請前要看最新人數與誰在裡面），
 * status 多一個 none = 我跟這間房沒關係。requests 只有房主拿得到，其他人是空陣列。
 */
export type RoomDetail = Omit<ScheduleItem, "status"> & {
	status: MemberStatus | "none";
	members: RoomMember[];
	requests: RoomMember[];
};

/** 別人開的、還能申請的房（GET /api/rooms?from&to） */
export type OpenRoom = Omit<ScheduleItem, "kind" | "status"> & { host: RoomMember };

/** 房間裡的一個人（GET /api/rooms/:code/entry）。lang = 母語，決定徽章與泡泡顏色 */
export type RoomParticipant = RoomMember & { lang: Lang; me: boolean };

/**
 * 進房的答案。ok = 可以進、附房間資料與成員；不行的話 reason 說為什麼，
 * notStarted 附 opensAt（開始前 ROOM_ENTRY_LEAD_MINUTES 分鐘）讓前端倒數。
 * 這是頁面的體驗層；WS 握手與簽 token 各自再用 roomAccess 擋一次。
 */
export type RoomEntry =
	| {
			ok: true;
			role: "host" | "member";
			room: Omit<ScheduleItem, "kind" | "status" | "seats">;
			participants: RoomParticipant[];
	  }
	| { ok: false; reason: "notFound" | "cancelled" | "notMember" | "notStarted" | "ended"; opensAt?: string };

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
 * 房間。週曆與 Find Monsters 都是 Rooms + RoomMembers 的投影。
 *
 *   GET  /api/me/schedule?from&to          我有份的房（開的、加入的、申請中的）
 *   GET  /api/rooms?from&to                別人開的、還有位、我還沒申請過、不撞我已加入的房
 *   GET  /api/rooms/:code                  詳情 + 成員（任何登入的人）；房主另外拿到申請中的名單
 *   GET  /api/rooms/:code/entry            進房：roomAccess 的答案 + 房間資料 + 成員（含母語、誰是我）
 *   POST /api/rooms                        開房：交易內查重疊 → 插主單 → 插房主子單
 *   POST /api/rooms/:code/join             申請加入（requested）；left 過的走狀態轉換
 *   POST /api/rooms/:code/leave            取消申請 / 退出（→ left）；房主不能走這條，要取消房
 *   POST /api/rooms/:code/requests/:userId 房主審核 { decision: "approve" | "reject" }
 *   POST /api/rooms/:code/cancel           房主取消未開始的房（寫 cancelDate）
 *
 * 已取消的房：GET / join / leave / requests 一律回 410 { error: "cancelled" }（不是 404），
 * 別人的畫面上那張卡可能還在（清單是進頁時拉的），前端要能顯示「此房間已被取消」。
 *
 * 規則放 app 層的交易裡：同一人 approved 的房不重疊（申請時查、同意時再查一次）、名額只算 approved
 * （申請時查、同意時再查一次）。不做 DB 的 exclusion constraint（drizzle 要 raw SQL，發表前不值得）。
 *
 * 通知（notify）寫在**同一個交易裡**、緊接在狀態改完之後：開房給房主自己、申請給房主、審核給申請者、
 * 取消給已加入的成員、退出（approved 的才算）給房主。前端不另外打，狀態改了通知一定有。
 */
export function roomsRoutes(auth: Auth, db: Db) {
	const app = new Hono();
	const guard = requireUser(auth);

	app.get("/me/schedule", guard, async (c) => {
		const range = parseRange(c.req.query("from"), c.req.query("to"));
		if (!range) return c.json({ error: "invalid", field: "range" }, 400);

		const rows = await db
			.select({ room: schema.rooms, role: schema.roomMembers.role, status: schema.roomMembers.status })
			.from(schema.roomMembers)
			.innerJoin(schema.rooms, eq(schema.roomMembers.roomId, schema.rooms.id))
			.where(
				and(
					eq(schema.roomMembers.userId, c.var.user.id),
					inArray(schema.roomMembers.status, ["approved", "requested"]),
					isNull(schema.rooms.cancelDate),
					overlapping(range.from, range.to),
				),
			)
			.orderBy(schema.rooms.startDate);
		const taken = await seatsTaken(
			db,
			rows.map((r) => r.room.id),
		);
		const items: ScheduleItem[] = rows.map((r) =>
			toItem(r.room, r.role === "host" ? "hosted" : "session", asStatus(r.status), taken.get(r.room.id) ?? 0),
		);
		return c.json(items);
	});

	app.get("/rooms", guard, async (c) => {
		const me = c.var.user.id;
		const range = parseRange(c.req.query("from"), c.req.query("to"));
		if (!range) return c.json({ error: "invalid", field: "range" }, 400);

		const myMembers = alias(schema.roomMembers, "myMembers");
		const myRooms = alias(schema.rooms, "myRooms");
		const rows = await db
			.select({
				room: schema.rooms,
				host: { id: schema.users.id, name: schema.users.name, avatar: schema.avatars.code },
			})
			.from(schema.rooms)
			.innerJoin(schema.users, eq(schema.rooms.hostId, schema.users.id))
			.innerJoin(schema.avatars, eq(schema.users.avatarId, schema.avatars.id))
			.where(
				and(
					isNull(schema.rooms.cancelDate),
					gt(schema.rooms.startDate, new Date()),
					overlapping(range.from, range.to),
					ne(schema.rooms.hostId, me),
					// 已經有關係的不列：加入了、申請中的在我的週曆上；被拒的不再誘惑。left 過的可以再申請
					notExists(
						db
							.select({ one: sql`1` })
							.from(myMembers)
							.where(
								and(
									eq(myMembers.roomId, schema.rooms.id),
									eq(myMembers.userId, me),
									inArray(myMembers.status, ["approved", "requested", "rejected"]),
								),
							),
					),
					// 撞到我已加入的房的不列：規則上加不了，畫出來只是誤導
					notExists(
						db
							.select({ one: sql`1` })
							.from(myMembers)
							.innerJoin(myRooms, eq(myMembers.roomId, myRooms.id))
							.where(
								and(
									eq(myMembers.userId, me),
									eq(myMembers.status, "approved"),
									isNull(myRooms.cancelDate),
									lt(myRooms.startDate, schema.rooms.endDate),
									gt(myRooms.endDate, schema.rooms.startDate),
								),
							),
					),
				),
			)
			.orderBy(schema.rooms.startDate);
		const taken = await seatsTaken(
			db,
			rows.map((r) => r.room.id),
		);
		const open: OpenRoom[] = rows
			.filter((r) => (taken.get(r.room.id) ?? 0) < r.room.capacity)
			.map((r) => {
				const { kind: _k, status: _s, ...base } = toItem(r.room, "session", "approved", taken.get(r.room.id) ?? 0);
				return { ...base, host: { ...r.host, role: "host" } };
			});
		return c.json(open);
	});

	app.get("/rooms/:code/entry", guard, async (c) => {
		const me = c.var.user.id;
		const access = await roomAccess(db, me, c.req.param("code"));
		if (!access.ok) {
			const body: RoomEntry = {
				ok: false,
				reason: access.reason,
				opensAt:
					access.reason === "notStarted" && access.room
						? new Date(access.room.startDate.getTime() - ROOM_ENTRY_LEAD_MINUTES * 60_000).toISOString()
						: undefined,
			};
			const status = access.reason === "notFound" ? 404 : access.reason === "cancelled" ? 410 : 403;
			return c.json(body, status);
		}

		const people = await db
			.select({
				id: schema.users.id,
				name: schema.users.name,
				avatar: schema.avatars.code,
				lang: schema.users.nativeLang,
				role: schema.roomMembers.role,
			})
			.from(schema.roomMembers)
			.innerJoin(schema.users, eq(schema.roomMembers.userId, schema.users.id))
			.innerJoin(schema.avatars, eq(schema.users.avatarId, schema.avatars.id))
			.where(and(eq(schema.roomMembers.roomId, access.room.id), eq(schema.roomMembers.status, "approved")))
			.orderBy(schema.roomMembers.role, schema.roomMembers.createDate);
		const { kind: _k, status: _s, seats: _seats, ...room } = toItem(access.room, "session", "approved", people.length);
		const body: RoomEntry = {
			ok: true,
			role: access.role,
			room,
			participants: people.map((p) => ({
				id: p.id,
				name: p.name,
				avatar: p.avatar,
				lang: p.lang as Lang,
				role: p.role === "host" ? "host" : "member",
				me: p.id === me,
			})),
		};
		return c.json(body);
	});

	app.get("/rooms/:code", guard, async (c) => {
		const me = c.var.user.id;
		const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.code, c.req.param("code"))).limit(1);
		if (!room) return c.json({ error: "notFound" }, 404);
		if (room.cancelDate) return c.json({ error: "cancelled" }, 410);
		const [mine] = await db
			.select({ role: schema.roomMembers.role, status: schema.roomMembers.status })
			.from(schema.roomMembers)
			.where(
				and(
					eq(schema.roomMembers.roomId, room.id),
					eq(schema.roomMembers.userId, me),
					inArray(schema.roomMembers.status, ["approved", "requested"]),
				),
			)
			.limit(1);
		const kind: ScheduleKind = mine?.role === "host" ? "hosted" : "session";
		return c.json(await loadDetail(db, room, kind, mine ? asStatus(mine.status) : "none"));
	});

	app.post("/rooms", guard, async (c) => {
		const body: unknown = await c.req.json().catch(() => null);
		const parsed = parseRoomInput(body);
		if (!parsed.ok) return c.json({ error: parsed.error, field: parsed.field }, 400);
		const me = c.var.user.id;
		const { input, start, end } = parsed;

		const code = await freeCode(db);
		const room = await db.transaction(async (tx) => {
			if (await hasClash(tx, me, start, end)) return null;
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
			await notify(tx, me, "roomCreated", { room: created });
			return created;
		});
		if (!room) return c.json({ error: "overlap" }, 409);
		return c.json(toItem(room, "hosted", "approved", 1), 201);
	});

	app.post("/rooms/:code/join", guard, async (c) => {
		const me = c.var.user.id;
		const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.code, c.req.param("code"))).limit(1);
		if (!room) return c.json({ error: "notFound" }, 404);
		if (room.cancelDate) return c.json({ error: "cancelled" }, 410);
		if (room.hostId === me) return c.json({ error: "host" }, 409);
		if (room.startDate.getTime() <= Date.now()) return c.json({ error: "started" }, 409);

		const [existing] = await db
			.select()
			.from(schema.roomMembers)
			.where(and(eq(schema.roomMembers.roomId, room.id), eq(schema.roomMembers.userId, me)))
			.limit(1);
		if (existing?.status === "approved" || existing?.status === "requested") return c.json({ error: "already" }, 409);
		if (existing?.status === "rejected") return c.json({ error: "rejected" }, 409);

		const result = await db.transaction(async (tx) => {
			const taken = (await seatsTaken(tx, [room.id])).get(room.id) ?? 0;
			if (taken >= room.capacity) return { error: "full" as const };
			if (await hasClash(tx, me, room.startDate, room.endDate)) return { error: "overlap" as const };
			if (existing) {
				await tx
					.update(schema.roomMembers)
					.set({ status: "requested", updateDate: new Date() })
					.where(eq(schema.roomMembers.id, existing.id));
			} else {
				await tx.insert(schema.roomMembers).values({ roomId: room.id, userId: me, role: "member", status: "requested" });
			}
			await notify(tx, room.hostId, "joinRequested", { room, actor: c.var.user });
			return { taken };
		});
		if ("error" in result) return c.json({ error: result.error }, 409);
		return c.json(toItem(room, "session", "requested", result.taken), 201);
	});

	app.post("/rooms/:code/leave", guard, async (c) => {
		const me = c.var.user.id;
		const [row] = await db
			.select({ room: schema.rooms, member: schema.roomMembers })
			.from(schema.rooms)
			.innerJoin(
				schema.roomMembers,
				and(eq(schema.roomMembers.roomId, schema.rooms.id), eq(schema.roomMembers.userId, me)),
			)
			.where(eq(schema.rooms.code, c.req.param("code")))
			.limit(1);
		if (!row) return c.json({ error: "notFound" }, 404);
		if (row.room.cancelDate) return c.json({ error: "cancelled" }, 410);
		// 房主沒有「退出」，只有取消房
		if (row.member.role === "host") return c.json({ error: "host" }, 409);
		if (row.member.status !== "requested" && row.member.status !== "approved") return c.json({ error: "notMember" }, 409);

		await db.transaction(async (tx) => {
			await tx
				.update(schema.roomMembers)
				.set({ status: "left", updateDate: new Date() })
				.where(eq(schema.roomMembers.id, row.member.id));
			// 申請中就收回的不算退出，房主不用知道
			if (row.member.status === "approved") await notify(tx, row.room.hostId, "memberLeft", { room: row.room, actor: c.var.user });
		});
		return c.body(null, 204);
	});

	app.post("/rooms/:code/requests/:userId", guard, async (c) => {
		const me = c.var.user.id;
		const body: unknown = await c.req.json().catch(() => null);
		const decision = typeof body === "object" && body !== null && "decision" in body ? body.decision : undefined;
		if (decision !== "approve" && decision !== "reject") return c.json({ error: "invalid", field: "decision" }, 400);

		const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.code, c.req.param("code"))).limit(1);
		if (!room || room.hostId !== me) return c.json({ error: "notFound" }, 404);
		if (room.cancelDate) return c.json({ error: "cancelled" }, 410);
		if (room.startDate.getTime() <= Date.now()) return c.json({ error: "started" }, 409);

		const applicant = c.req.param("userId");
		const result = await db.transaction(async (tx) => {
			const [member] = await tx
				.select()
				.from(schema.roomMembers)
				.where(and(eq(schema.roomMembers.roomId, room.id), eq(schema.roomMembers.userId, applicant)))
				.limit(1);
			if (member?.status !== "requested") return { error: "notRequested" as const };
			if (decision === "approve") {
				const taken = (await seatsTaken(tx, [room.id])).get(room.id) ?? 0;
				if (taken >= room.capacity) return { error: "full" as const };
				// 申請人可能在等的期間又加入了別的房，同意前再驗一次
				if (await hasClash(tx, applicant, room.startDate, room.endDate)) return { error: "overlap" as const };
			}
			await tx
				.update(schema.roomMembers)
				.set({ status: decision === "approve" ? "approved" : "rejected", updateDate: new Date() })
				.where(eq(schema.roomMembers.id, member.id));
			await notify(tx, applicant, decision === "approve" ? "joinApproved" : "joinRejected", { room, actor: c.var.user });
			return {};
		});
		if ("error" in result) return c.json({ error: result.error }, 409);
		return c.json(await loadDetail(db, room, "hosted", "approved"));
	});

	app.post("/rooms/:code/cancel", guard, async (c) => {
		const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.code, c.req.param("code"))).limit(1);
		// 不是房主跟不存在回一樣的 404：別人的房號猜不猜得到都不該有差別
		if (!room || room.hostId !== c.var.user.id) return c.json({ error: "notFound" }, 404);
		if (room.cancelDate) return c.json({ error: "cancelled" }, 409);
		// 開始了就不能取消 —— 那是「離開房間」的事，而且成員可能已經在裡面
		if (room.startDate.getTime() <= Date.now()) return c.json({ error: "started" }, 409);

		const now = new Date();
		await db.transaction(async (tx) => {
			await tx
				.update(schema.rooms)
				.set({ cancelDate: now, updateDate: now })
				.where(and(eq(schema.rooms.id, room.id), isNull(schema.rooms.cancelDate)));
			const members = await tx
				.select({ userId: schema.roomMembers.userId })
				.from(schema.roomMembers)
				.where(
					and(
						eq(schema.roomMembers.roomId, room.id),
						eq(schema.roomMembers.status, "approved"),
						ne(schema.roomMembers.userId, room.hostId),
					),
				);
			await notify(
				tx,
				members.map((m) => m.userId),
				"roomCancelled",
				{ room, actor: c.var.user },
			);
		});
		return c.body(null, 204);
	});

	return app;
}

type RoomRow = typeof schema.rooms.$inferSelect;
/** 交易或連線都能傳進來的最小介面 */
type Queryable = Pick<Db, "select">;

/** 房跟 [from, to) 有交集。同一條式子拿來查週曆，也拿來擋重疊 */
function overlapping(from: Date, to: Date) {
	return and(lt(schema.rooms.startDate, to), gt(schema.rooms.endDate, from));
}

/** 這個人 approved 的房（含自己開的）有沒有跟 [start, end) 撞到 */
async function hasClash(q: Queryable, userId: string, start: Date, end: Date): Promise<boolean> {
	const clash = await q
		.select({ id: schema.rooms.id })
		.from(schema.roomMembers)
		.innerJoin(schema.rooms, eq(schema.roomMembers.roomId, schema.rooms.id))
		.where(
			and(
				eq(schema.roomMembers.userId, userId),
				eq(schema.roomMembers.status, "approved"),
				isNull(schema.rooms.cancelDate),
				overlapping(start, end),
			),
		)
		.limit(1);
	return clash.length > 0;
}

/** 各房已同意的人數（含房主） */
async function seatsTaken(q: Queryable, roomIds: number[]): Promise<Map<number, number>> {
	if (!roomIds.length) return new Map();
	const rows = await q
		.select({ roomId: schema.roomMembers.roomId, taken: count() })
		.from(schema.roomMembers)
		.where(and(inArray(schema.roomMembers.roomId, roomIds), eq(schema.roomMembers.status, "approved")))
		.groupBy(schema.roomMembers.roomId);
	return new Map(rows.map((r) => [r.roomId, r.taken]));
}

/** 詳情：已加入的人（房主排第一，"host" < "member"），房主另外拿到申請中的名單 */
async function loadDetail(
	db: Db,
	room: RoomRow,
	kind: ScheduleKind,
	status: MemberStatus | "none",
): Promise<RoomDetail> {
	const people = await db
		.select({
			id: schema.users.id,
			name: schema.users.name,
			avatar: schema.avatars.code,
			role: schema.roomMembers.role,
			status: schema.roomMembers.status,
		})
		.from(schema.roomMembers)
		.innerJoin(schema.users, eq(schema.roomMembers.userId, schema.users.id))
		.innerJoin(schema.avatars, eq(schema.users.avatarId, schema.avatars.id))
		.where(and(eq(schema.roomMembers.roomId, room.id), inArray(schema.roomMembers.status, ["approved", "requested"])))
		.orderBy(schema.roomMembers.role, schema.roomMembers.createDate);
	const toMember = (p: (typeof people)[number]): RoomMember => ({
		id: p.id,
		name: p.name,
		avatar: p.avatar,
		role: p.role === "host" ? "host" : "member",
	});
	const members = people.filter((p) => p.status === "approved").map(toMember);
	const requests = kind === "hosted" ? people.filter((p) => p.status === "requested").map(toMember) : [];
	return { ...toItem(room, kind, status === "none" ? "approved" : status, members.length), status, members, requests };
}

function toItem(room: RoomRow, kind: ScheduleKind, status: MemberStatus, taken: number): ScheduleItem {
	const type = ROOM_TYPES.find((t) => t.id === room.roomType);
	if (!type) throw new Error(`Rooms.roomType ${room.roomType} 不在 ROOM_TYPES 裡`);
	return {
		id: room.id,
		code: room.code,
		kind,
		status,
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

const asStatus = (s: string): MemberStatus => (s === "requested" ? "requested" : "approved");

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

function parseRange(from: string | undefined, to: string | undefined): { from: Date; to: Date } | null {
	const f = parseDate(from);
	const t = parseDate(to);
	return f && t && f < t ? { from: f, to: t } : null;
}

type Parsed =
	| { ok: true; input: RoomInput; start: Date; end: Date }
	/** tooSoon 獨立一個碼：前端要顯示「請選下一個時段」，跟一般格式錯誤的文案不同 */
	| { ok: false; error: "invalid" | "tooSoon"; field: string };

/** 手寫驗證，400 帶第一個錯的欄位名（跟 profile 同一套） */
function parseRoomInput(body: unknown): Parsed {
	const invalid = (field: string): Parsed => ({ ok: false, error: "invalid", field });
	if (typeof body !== "object" || body === null) return invalid("body");
	const b = body as Record<string, unknown>;

	// 標題必填（使用者 2026-09-22），去頭尾空白後不能是空的
	const title = typeof b.title === "string" ? b.title.trim() : "";
	if (!title || title.length > ROOM_TITLE_MAX) return invalid("title");

	// 整分（秒與毫秒為 0）。:00 / :30 的粒度由前端的選單保證 —— server 不碰時區，
	// 用 UTC 的分鐘去卡 :00 / :30 在半小時時差的地方會誤判
	const start = typeof b.startDate === "string" ? parseDate(b.startDate) : null;
	if (!start || start.getTime() % 60_000 !== 0) return invalid("startDate");
	// 至少要在 ROOM_LEAD_MINUTES 之後：16:49 只能開 17:30，不能開 17:00
	if (start.getTime() < Date.now() + ROOM_LEAD_MINUTES * 60_000) {
		return { ok: false, error: "tooSoon", field: "startDate" };
	}

	const { durationMinutes, capacity, roomType } = b;
	if (!isDuration(durationMinutes)) return invalid("durationMinutes");
	if (
		typeof capacity !== "number" ||
		!Number.isInteger(capacity) ||
		capacity < ROOM_CAPACITY_MIN ||
		capacity > ROOM_CAPACITY_MAX
	) {
		return invalid("capacity");
	}
	if (!isRoomType(roomType)) return invalid("roomType");

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
