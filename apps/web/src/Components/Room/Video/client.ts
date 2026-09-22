import { apiUrl } from "@/api";

/**
 * 視訊代打 API（apps/api 的 routes/video.ts）。body 與回應都是 Cloudflare Realtime SFU 的原樣，
 * 這裡只包 fetch 與錯誤；SDP / track 的邏輯在 useSfu。
 */
export type Sdp = { type: "offer" | "answer"; sdp: string };
export type TrackSpec =
	| { location: "local"; mid: string; trackName: string }
	| { location: "remote"; sessionId: string; trackName: string };

export type TracksResponse = {
	requiresImmediateRenegotiation?: boolean;
	sessionDescription?: Sdp;
	tracks?: { mid?: string; trackName?: string; sessionId?: string; errorCode?: string; errorDescription?: string }[];
};

export type VideoResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function call<T>(method: "POST" | "PUT", code: string, path: string, body?: unknown): Promise<VideoResult<T>> {
	let response: Response;
	try {
		response = await fetch(apiUrl(`/api/rooms/${encodeURIComponent(code)}/video${path}`), {
			method,
			credentials: "include",
			headers: body === undefined ? undefined : { "Content-Type": "application/json" },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	} catch {
		return { ok: false, status: 0, error: "network" };
	}
	const data: unknown = await response.json().catch(() => null);
	if (response.ok) return { ok: true, data: data as T };
	const error = typeof data === "object" && data !== null && "error" in data ? String(data.error) : "unknown";
	return { ok: false, status: response.status, error };
}

export const createSession = (code: string) => call<{ sessionId: string }>("POST", code, "/sessions");

export const newTracks = (code: string, sid: string, body: { sessionDescription?: Sdp; tracks: TrackSpec[] }) =>
	call<TracksResponse>("POST", code, `/sessions/${encodeURIComponent(sid)}/tracks`, body);

export const renegotiate = (code: string, sid: string, sessionDescription: Sdp) =>
	call<unknown>("PUT", code, `/sessions/${encodeURIComponent(sid)}/renegotiate`, { sessionDescription });

export const closeTracks = (code: string, sid: string, body: { tracks: { mid: string }[]; force: boolean; sessionDescription?: Sdp }) =>
	call<TracksResponse>("PUT", code, `/sessions/${encodeURIComponent(sid)}/tracks/close`, body);
