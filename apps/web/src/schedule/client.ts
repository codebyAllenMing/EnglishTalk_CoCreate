import { apiUrl } from "@/api";
import type { LangCode } from "@/Components/Profile/profileData";

/** 跟 apps/api 的 routes/rooms.ts 同形狀 */
export type ScheduleKind = "hosted" | "session";
export type RoomDuration = 20 | 40 | 60;
/** Rooms.roomType 的 enum id：1 = en → zh、2 = zh → en。API 回傳時已展開成 from / to，只有開房要送它 */
export type RoomTypeId = 1 | 2;

export type ScheduleItem = {
	id: number;
	code: string;
	kind: ScheduleKind;
	title: string;
	/** ISO（UTC）。網格要的當地日期與分鐘在 scheduleData.ts 的 toSlot() 換 */
	startDate: string;
	endDate: string;
	durationMinutes: RoomDuration;
	capacity: number;
	seats: { taken: number; total: number };
	from: LangCode;
	to: LangCode;
};

/**
 * [from, to) 之間我有份的房：我開的 + 我加入且房主已同意的，已取消的不含。
 * 沒登入是 401 → throw，ScheduleBoard 吞掉畫空網格（SessionProvider 會導去 login）。
 */
export async function getSchedule(from: Date, to: Date): Promise<ScheduleItem[]> {
	const query = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
	const response = await fetch(apiUrl(`/api/me/schedule?${query}`), { credentials: "include" });
	if (!response.ok) throw new Error(`schedule responded ${response.status}`);
	return response.json();
}

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
	/** overlap：跟我其他房撞時間（409）；invalid：後端驗證不過，field 是第一個錯的欄位（400） */
	| { ok: false; reason: "overlap" | "invalid" | "network"; field?: string };

export async function createRoom(input: RoomInput): Promise<CreateRoomResult> {
	let response: Response;
	try {
		response = await fetch(apiUrl("/api/rooms"), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify(input),
		});
	} catch {
		return { ok: false, reason: "network" };
	}
	if (response.status === 409) return { ok: false, reason: "overlap" };
	if (!response.ok) {
		const data: unknown = await response.json().catch(() => null);
		const field = typeof data === "object" && data !== null && "field" in data ? String(data.field) : undefined;
		return { ok: false, reason: "invalid", field };
	}
	return { ok: true, item: await response.json() };
}
