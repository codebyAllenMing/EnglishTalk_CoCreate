import { apiUrl } from "@/api";
import type { LangCode } from "@/Components/Profile/profileData";

/** 跟 apps/api 的 routes/rooms.ts 同形狀 */
export type ScheduleKind = "hosted" | "session";
/** 我跟這間房的關係：approved = 已加入（房主也是）、requested = 申請中等房主 */
export type MemberStatus = "approved" | "requested";
export type RoomDuration = 20 | 40 | 60;
/** Rooms.roomType 的 enum id：1 = en → zh、2 = zh → en。API 回傳時已展開成 from / to，只有開房要送它 */
export type RoomTypeId = 1 | 2;

export type ScheduleItem = {
	id: number;
	code: string;
	kind: ScheduleKind;
	status: MemberStatus;
	title: string;
	/** ISO（UTC）。網格要的當地日期與分鐘在 scheduleData.ts 換 */
	startDate: string;
	endDate: string;
	durationMinutes: RoomDuration;
	capacity: number;
	/** taken 只算 approved */
	seats: { taken: number; total: number };
	from: LangCode;
	to: LangCode;
};

export type RoomMember = { id: string; name: string; avatar: string; role: "host" | "member" };
/** 任何登入的人都拿得到；status none = 我跟這間房沒關係。requests 只有房主拿得到，其他人是空陣列 */
export type RoomDetail = Omit<ScheduleItem, "status"> & {
	status: MemberStatus | "none";
	members: RoomMember[];
	requests: RoomMember[];
};
/** 別人開的、還有位、我還沒申請過的房 */
export type OpenRoom = Omit<ScheduleItem, "kind" | "status"> & { host: RoomMember };

/** GET 失敗時丟這個，呼叫端可以看 code 分辨「已取消」跟一般失敗 */
export class ApiError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: string,
	) {
		super(`${status} ${code}`);
	}
}

export const isCancelled = (error: unknown) => error instanceof ApiError && error.code === "cancelled";

async function getJson<T>(path: string): Promise<T> {
	const response = await fetch(apiUrl(path), { credentials: "include" });
	if (!response.ok) {
		const data: unknown = await response.json().catch(() => null);
		const code = typeof data === "object" && data !== null && "error" in data ? String(data.error) : "unknown";
		throw new ApiError(response.status, code);
	}
	return response.json();
}

type PostOutcome<T> = { ok: true; data: T } | { ok: false; error: string } | { ok: false; error: "network" };

async function post<T>(path: string, body?: unknown): Promise<PostOutcome<T>> {
	let response: Response;
	try {
		response = await fetch(apiUrl(path), {
			method: "POST",
			credentials: "include",
			headers: body === undefined ? undefined : { "Content-Type": "application/json" },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	} catch {
		return { ok: false, error: "network" };
	}
	if (response.ok) return { ok: true, data: response.status === 204 ? (undefined as T) : await response.json() };
	const data: unknown = await response.json().catch(() => null);
	const error = typeof data === "object" && data !== null && "error" in data ? String(data.error) : "unknown";
	return { ok: false, error };
}

/** 後端的錯誤碼只留 UI 會分開處理的，其餘歸 unknown */
function known<K extends string>(error: string, keys: readonly K[]): K | "unknown" {
	return (keys as readonly string[]).includes(error) ? (error as K) : "unknown";
}

const range = (from: Date, to: Date) => new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });

/**
 * [from, to) 之間我有份的房：我開的、我加入的、我申請中的，已取消的不含。
 * 沒登入是 401 → throw，ScheduleBoard 吞掉畫空網格（SessionProvider 會導去 login）。
 */
export const getSchedule = (from: Date, to: Date) => getJson<ScheduleItem[]>(`/api/me/schedule?${range(from, to)}`);

/** 別人開的、還有位、我還沒申請過、不撞我已加入的房 */
export const getOpenRooms = (from: Date, to: Date) => getJson<OpenRoom[]>(`/api/rooms?${range(from, to)}`);

/** 一間房的詳情與已加入的成員（含房主）。未取消的房任何登入的人都拿得到；申請前用它看最新人數 */
export const getRoom = (code: string) => getJson<RoomDetail>(`/api/rooms/${encodeURIComponent(code)}`);

/** POST /api/rooms 的 body。endDate 不送，server 算 */
export type RoomInput = {
	title: string;
	/** ISO，整分 */
	startDate: string;
	durationMinutes: RoomDuration;
	capacity: number;
	roomType: RoomTypeId;
};

export type CreateRoomResult =
	| { ok: true; item: ScheduleItem }
	/** overlap：跟我其他房撞時間（409）；tooSoon：開始時間不到 30 分鐘後（400）；invalid：其他驗證不過（400） */
	| { ok: false; reason: "overlap" | "tooSoon" | "invalid" | "network" };

export async function createRoom(input: RoomInput): Promise<CreateRoomResult> {
	const r = await post<ScheduleItem>("/api/rooms", input);
	if (r.ok) return { ok: true, item: r.data };
	const reason = known(r.error, ["overlap", "tooSoon", "network"]);
	return { ok: false, reason: reason === "unknown" ? "invalid" : reason };
}

export type JoinResult =
	| { ok: true; item: ScheduleItem }
	| { ok: false; reason: "full" | "overlap" | "started" | "cancelled" | "network" | "unknown" };

/** 申請加入別人的房，成功回那間房在我週曆上的樣子（status requested） */
export async function joinRoom(code: string): Promise<JoinResult> {
	const r = await post<ScheduleItem>(`/api/rooms/${encodeURIComponent(code)}/join`);
	if (r.ok) return { ok: true, item: r.data };
	return { ok: false, reason: known(r.error, ["full", "overlap", "started", "cancelled", "network"]) };
}

export type SimpleResult = { ok: true } | { ok: false; reason: "started" | "cancelled" | "network" | "unknown" };

/** 取消申請 / 退出（房主沒有這條，房主用 cancelRoom） */
export async function leaveRoom(code: string): Promise<SimpleResult> {
	const r = await post<undefined>(`/api/rooms/${encodeURIComponent(code)}/leave`);
	return r.ok ? { ok: true } : { ok: false, reason: known(r.error, ["started", "cancelled", "network"]) };
}

/** 取消我開的房。started：已經開始（409） */
export async function cancelRoom(code: string): Promise<SimpleResult> {
	const r = await post<undefined>(`/api/rooms/${encodeURIComponent(code)}/cancel`);
	return r.ok ? { ok: true } : { ok: false, reason: known(r.error, ["started", "network"]) };
}

export type DecideResult =
	| { ok: true; detail: RoomDetail }
	| { ok: false; reason: "full" | "overlap" | "started" | "cancelled" | "network" | "unknown" };

/** 房主同意 / 拒絕一個申請，成功回更新後的詳情（成員與申請名單都是新的） */
export async function decideRequest(code: string, userId: string, decision: "approve" | "reject"): Promise<DecideResult> {
	const r = await post<RoomDetail>(
		`/api/rooms/${encodeURIComponent(code)}/requests/${encodeURIComponent(userId)}`,
		{ decision },
	);
	if (r.ok) return { ok: true, detail: r.data };
	return { ok: false, reason: known(r.error, ["full", "overlap", "started", "cancelled", "network"]) };
}
