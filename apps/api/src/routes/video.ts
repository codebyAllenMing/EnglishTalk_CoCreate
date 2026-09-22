import { Hono } from "hono";
import { requireUser, type Auth } from "@monstertalk/auth";
import type { Db } from "@monstertalk/db";
import { logError, logWarn } from "../log.ts";
import { roomAccess } from "../rooms/access.ts";

/** Cloudflare Realtime Serverless SFU 的 App（儀表板 Realtime → Serverless SFU → Create）。Secret 只在 server */
export type RealtimeConfig = { appId: string; secret: string };

/** 一個 SFU session 是誰在哪間房開的；別人的 session 只能被同一間房的人「拉」 */
type Owner = { userId: string; roomId: number; createDate: number };

const CF_BASE = "https://rtc.live.cloudflare.com/v1/apps";
/** 房最長 60 分 + 進房提前 5 分 + 寬限；超過就當這個 session 沒人記得 */
const OWNER_TTL_MS = 3 * 60 * 60_000;
const SDP_MAX = 100_000;
const UPSTREAM_TIMEOUT_MS = 10_000;
const NAME_MAX = 64;

type Sdp = { type: "offer" | "answer"; sdp: string };
type TrackSpec =
	| { location: "local"; mid: string; trackName: string }
	| { location: "remote"; sessionId: string; trackName: string };

/**
 * 視訊：Cloudflare Realtime SFU 的代打層（使用者 2026-09-22 定案走這條）。
 *
 * client 永遠不碰 App Secret，只產 SDP 交給這裡轉打 Cloudflare。每一條都先過 `roomAccess`（跟 WS 握手同一道門），
 * 有 sessionId 的再驗「這個 session 是我在這間房開的」；拉別人的 track 時，對方的 session 也要是同一間房的。
 *
 *   POST /api/rooms/:code/video/sessions                          開 session → { sessionId }
 *   POST /api/rooms/:code/video/sessions/:sid/tracks              推（local + offer）或拉（remote）；回 Cloudflare 的答案原樣
 *   PUT  /api/rooms/:code/video/sessions/:sid/renegotiate         拉完之後把 answer 交回去
 *   PUT  /api/rooms/:code/video/sessions/:sid/tracks/close        關 track
 *
 * 沒設定 App（env 沒 CF_REALTIME_*）一律 503 { error: "unavailable" }，前端畫「視訊未設定」。
 * session ↔ 擁有者的對照只在記憶體（dev：api 行程；prod：搬進 Durable Object），行程重啟後舊 session 就不認了，
 * 前端重連時會重開 session，沒差。
 */
export function videoRoutes(auth: Auth, db: Db, realtime: RealtimeConfig | undefined) {
	const app = new Hono();
	const guard = requireUser(auth);
	const owners = new Map<string, Owner>();

	/** 打 Cloudflare。連不到（DNS、逾時）是例外 → logError 後當 502；回非 2xx 是預期中的失敗 → logWarn，body 原樣往回傳 */
	const cf = async (path: string, method: "POST" | "PUT", body: unknown, context: Record<string, unknown>) => {
		if (!realtime) throw new Error("realtime not configured");
		let response: Response;
		try {
			response = await fetch(`${CF_BASE}/${realtime.appId}${path}`, {
				method,
				headers: { Authorization: `Bearer ${realtime.secret}`, "Content-Type": "application/json" },
				body: body === undefined ? undefined : JSON.stringify(body),
				signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
			});
		} catch (error) {
			logError("video.upstream", error, { ...context, method, path });
			return { ok: false, status: 0, data: null };
		}
		const data: unknown = await response.json().catch(() => null);
		if (!response.ok) logWarn("video.upstream", `Cloudflare ${response.status}`, { ...context, method, path, status: response.status, data });
		return { ok: response.ok, status: response.status, data };
	};

	const prune = () => {
		const cutoff = Date.now() - OWNER_TTL_MS;
		for (const [id, owner] of owners) if (owner.createDate < cutoff) owners.delete(id);
	};

	type Gate = { ok: true; roomId: number; sid: string | undefined } | { ok: false; status: 403 | 404 | 410 | 503; error: string };

	/** 三道門：有設定、能進這間房、（有 sid 時）session 是我在這房開的 */
	const gate = async (c: { req: { param(name: string): string | undefined }; var: { user: { id: string } } }): Promise<Gate> => {
		if (!realtime) return { ok: false, status: 503, error: "unavailable" };
		const code = c.req.param("code") ?? "";
		const access = await roomAccess(db, c.var.user.id, code);
		if (!access.ok) {
			const status = access.reason === "notFound" ? 404 : access.reason === "cancelled" ? 410 : 403;
			return { ok: false, status, error: access.reason };
		}
		const sid = c.req.param("sid");
		if (sid !== undefined) {
			const owner = owners.get(sid);
			if (!owner || owner.userId !== c.var.user.id || owner.roomId !== access.room.id) {
				return { ok: false, status: 403, error: "notYourSession" };
			}
		}
		return { ok: true, roomId: access.room.id, sid };
	};

	app.post("/rooms/:code/video/sessions", guard, async (c) => {
		const g = await gate(c);
		if (!g.ok) return c.json({ error: g.error }, g.status);
		prune();
		const result = await cf("/sessions/new", "POST", undefined, { requestId: c.get("requestId"), userId: c.var.user.id, code: c.req.param("code") });
		const sessionId = pickString(result.data, "sessionId");
		if (!result.ok || !sessionId) return c.json({ error: "upstream" }, 502);
		owners.set(sessionId, { userId: c.var.user.id, roomId: g.roomId, createDate: Date.now() });
		return c.json({ sessionId }, 201);
	});

	app.post("/rooms/:code/video/sessions/:sid/tracks", guard, async (c) => {
		const g = await gate(c);
		if (!g.ok) return c.json({ error: g.error }, g.status);
		const body: unknown = await c.req.json().catch(() => null);
		const parsed = parseTracksBody(body);
		if (!parsed.ok) return c.json({ error: "invalid", field: parsed.field }, 400);
		// 只能拉同一間房的人的 track
		for (const t of parsed.tracks) {
			if (t.location === "remote" && owners.get(t.sessionId)?.roomId !== g.roomId) {
				return c.json({ error: "invalid", field: "tracks.sessionId" }, 400);
			}
		}
		const result = await cf(
			`/sessions/${g.sid}/tracks/new`,
			"POST",
			{ sessionDescription: parsed.sessionDescription, tracks: parsed.tracks },
			{ requestId: c.get("requestId"), userId: c.var.user.id, code: c.req.param("code"), sid: g.sid, tracks: parsed.tracks.length },
		);
		return c.json(result.data ?? { error: "upstream" }, result.ok ? 200 : 502);
	});

	app.put("/rooms/:code/video/sessions/:sid/renegotiate", guard, async (c) => {
		const g = await gate(c);
		if (!g.ok) return c.json({ error: g.error }, g.status);
		const body: unknown = await c.req.json().catch(() => null);
		const sdp = parseSdp(typeof body === "object" && body !== null ? (body as { sessionDescription?: unknown }).sessionDescription : undefined);
		if (!sdp) return c.json({ error: "invalid", field: "sessionDescription" }, 400);
		const result = await cf(`/sessions/${g.sid}/renegotiate`, "PUT", { sessionDescription: sdp }, { requestId: c.get("requestId"), userId: c.var.user.id, code: c.req.param("code"), sid: g.sid });
		return c.json(result.data ?? { error: "upstream" }, result.ok ? 200 : 502);
	});

	app.put("/rooms/:code/video/sessions/:sid/tracks/close", guard, async (c) => {
		const g = await gate(c);
		if (!g.ok) return c.json({ error: g.error }, g.status);
		const body: unknown = await c.req.json().catch(() => null);
		const parsed = parseCloseBody(body);
		if (!parsed.ok) return c.json({ error: "invalid", field: parsed.field }, 400);
		const result = await cf(`/sessions/${g.sid}/tracks/close`, "PUT", parsed.body, { requestId: c.get("requestId"), userId: c.var.user.id, code: c.req.param("code"), sid: g.sid });
		return c.json(result.data ?? { error: "upstream" }, result.ok ? 200 : 502);
	});

	return app;
}

function pickString(data: unknown, key: string): string | null {
	if (typeof data !== "object" || data === null) return null;
	const value = (data as Record<string, unknown>)[key];
	return typeof value === "string" && value ? value : null;
}

function parseSdp(value: unknown): Sdp | null {
	if (typeof value !== "object" || value === null) return null;
	const v = value as { type?: unknown; sdp?: unknown };
	if ((v.type !== "offer" && v.type !== "answer") || typeof v.sdp !== "string" || !v.sdp || v.sdp.length > SDP_MAX) return null;
	return { type: v.type, sdp: v.sdp };
}

function parseTrack(value: unknown): TrackSpec | null {
	if (typeof value !== "object" || value === null) return null;
	const v = value as Record<string, unknown>;
	const trackName = typeof v.trackName === "string" && v.trackName && v.trackName.length <= NAME_MAX ? v.trackName : null;
	if (!trackName) return null;
	if (v.location === "local") {
		return typeof v.mid === "string" && v.mid.length <= NAME_MAX ? { location: "local", mid: v.mid, trackName } : null;
	}
	if (v.location === "remote") {
		return typeof v.sessionId === "string" && v.sessionId && v.sessionId.length <= 128
			? { location: "remote", sessionId: v.sessionId, trackName }
			: null;
	}
	return null;
}

type TracksBody = { ok: true; sessionDescription?: Sdp; tracks: TrackSpec[] } | { ok: false; field: string };

function parseTracksBody(body: unknown): TracksBody {
	if (typeof body !== "object" || body === null) return { ok: false, field: "body" };
	const b = body as { sessionDescription?: unknown; tracks?: unknown };
	let sessionDescription: Sdp | undefined;
	if (b.sessionDescription !== undefined) {
		const sdp = parseSdp(b.sessionDescription);
		if (!sdp) return { ok: false, field: "sessionDescription" };
		sessionDescription = sdp;
	}
	if (!Array.isArray(b.tracks) || !b.tracks.length || b.tracks.length > 16) return { ok: false, field: "tracks" };
	const tracks: TrackSpec[] = [];
	for (const raw of b.tracks) {
		const t = parseTrack(raw);
		if (!t) return { ok: false, field: "tracks" };
		tracks.push(t);
	}
	return { ok: true, sessionDescription, tracks };
}

type CloseBody = { ok: true; body: { tracks: { mid: string }[]; force: boolean; sessionDescription?: Sdp } } | { ok: false; field: string };

function parseCloseBody(body: unknown): CloseBody {
	if (typeof body !== "object" || body === null) return { ok: false, field: "body" };
	const b = body as { tracks?: unknown; force?: unknown; sessionDescription?: unknown };
	if (!Array.isArray(b.tracks) || !b.tracks.length || b.tracks.length > 16) return { ok: false, field: "tracks" };
	const tracks: { mid: string }[] = [];
	for (const raw of b.tracks) {
		const mid = typeof raw === "object" && raw !== null ? (raw as { mid?: unknown }).mid : undefined;
		if (typeof mid !== "string" || mid.length > NAME_MAX) return { ok: false, field: "tracks" };
		tracks.push({ mid });
	}
	let sessionDescription: Sdp | undefined;
	if (b.sessionDescription !== undefined) {
		const sdp = parseSdp(b.sessionDescription);
		if (!sdp) return { ok: false, field: "sessionDescription" };
		sessionDescription = sdp;
	}
	return { ok: true, body: { tracks, force: b.force === true, sessionDescription } };
}
