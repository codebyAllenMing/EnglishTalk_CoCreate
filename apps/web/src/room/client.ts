import { apiUrl } from "@/api";
import type { LangCode } from "@/Components/Profile/profileData";

/** 跟 apps/api 的 routes/rooms.ts 的 RoomEntry 同形狀 */
export type RoomParticipant = {
	id: string;
	name: string;
	avatar: string;
	/** 母語：徽章與泡泡顏色 */
	lang: LangCode;
	role: "host" | "member";
	me: boolean;
};

export type RoomEntryRoom = {
	id: number;
	code: string;
	title: string;
	startDate: string;
	endDate: string;
	durationMinutes: 20 | 40 | 60;
	capacity: number;
	from: LangCode;
	to: LangCode;
};

export type RoomEntry =
	| { ok: true; role: "host" | "member"; room: RoomEntryRoom; participants: RoomParticipant[] }
	| {
			ok: false;
			reason: "notFound" | "cancelled" | "notMember" | "notStarted" | "ended" | "unauthorized" | "network";
			/** notStarted 才有：開始前 5 分鐘那一刻，前端倒數到它再問一次 */
			opensAt?: string;
	  };

/**
 * 進房前問一次「我能不能進、進去看到誰」。
 * 這是體驗層：真正的門在白板 / 聊天的 WS 握手與簽 token，那邊各自再查一次。
 */
export async function getRoomEntry(code: string): Promise<RoomEntry> {
	let response: Response;
	try {
		response = await fetch(apiUrl(`/api/rooms/${encodeURIComponent(code)}/entry`), { credentials: "include" });
	} catch {
		return { ok: false, reason: "network" };
	}
	if (response.status === 401) return { ok: false, reason: "unauthorized" };
	const data: unknown = await response.json().catch(() => null);
	if (typeof data === "object" && data !== null && "ok" in data) return data as RoomEntry;
	return { ok: false, reason: "network" };
}
