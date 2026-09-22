"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reportError } from "@/log";
import type { LiveStatus, MediaState } from "../useLive";
import { closeTracks, createSession, newTracks, renegotiate, type TracksResponse } from "./client";

export type VideoStatus = "connecting" | "live" | "denied" | "unavailable" | "failed";

type Input = {
	code: string;
	meId: string;
	liveStatus: LiveStatus;
	/** 全房的視訊狀態（useLive 給的），照單去拉 */
	media: Record<string, MediaState>;
	online: string[];
	sendMedia: (media: MediaState) => void;
};

type Pulled = { sessionId: string; mids: string[]; /** 第幾次重試（對方還沒送封包 / 舊 session） */ attempt: number };

type Conn = {
	pc: RTCPeerConnection;
	sessionId: string;
	local: MediaStream;
	/** 拉了誰的：userId → 對方 session 與我這邊的 mid */
	pulled: Map<string, Pulled>;
	/** 我這邊的 mid → 是誰的 track（ontrack 靠它分流） */
	midOwner: Map<string, string>;
	/** 所有 renegotiation 排隊做，一次一個 */
	queue: Promise<void>;
	/** 重試拉流的 setTimeout，unmount 時清掉 */
	retries: Map<string, ReturnType<typeof setTimeout>>;
	/** 這個連線是第幾代；換代（live 重連、session 被 api 不認）時舊的排程要作廢 */
	generation: number;
};

const ICE = { iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }], bundlePolicy: "max-bundle" as const };
const CONNECT_TIMEOUT_MS = 15_000;
const SENDING_TIMEOUT_MS = 5_000;
const TRACK_NAMES = ["audio", "video"] as const;
/** 對方的 track 還沒到（剛連上還沒送封包、或 session 剛換）→ 退避重拉；用完才算錯 */
const PULL_RETRY_MS = [500, 1000, 2000, 4000, 8000];
/** Cloudflare 對「發布端還沒送 / 沒這條 track」的錯誤碼，都當暫時的 */
const TRANSIENT_TRACK_ERRORS = new Set(["not_found_track_error", "empty_track_error"]);

/**
 * 視訊：Cloudflare Realtime SFU（使用者 2026-09-22 定案）。一條 PeerConnection 雙向共用：
 *
 *   進房 → getUserMedia → 開 session（走我們的 API 代打）→ 推兩條 local track（我是 offerer）→ 連上
 *        → 用 live WS 廣播 { sessionId, mic, cam }
 *   別人的 media 狀態進來 → 拉他的 audio / video（Cloudflare 給 offer、我答 answer → renegotiate）
 *   他離線或換了 session → 關掉那幾條 mid
 *   mic / cam 開關 = track.enabled + 廣播；關鏡頭不關 track（免 renegotiate），別人那邊看狀態畫頭像
 *
 * 所有 SDP 往返排隊做（queue）：Cloudflare 一次只能有一個進行中的 renegotiation。
 * 拿不到權限 / 沒設定 / 連不上都不擋房間，只是別人看到頭像；狀態給 VideoGrid 畫提示。
 *
 * ## 三個 race 的對策（使用者 2026-09-22 切換語言時撞到 not_found_track_error / empty_track_error）
 * - 發布端 ICE 連上還要幾百毫秒才有第一個 RTP 封包：**等 getStats 看到兩條 track 都送出封包才廣播** sessionId。
 * - 對方剛換 session（切語言、Fast Refresh、重新整理）或還沒送：拉到這兩種錯就**退避重拉**（0.5 → 8 秒，五次），中間只 warn。
 * - live WS 斷過再連上（api 重啟後記憶體裡的 session 擁有者對照沒了）：**整個視訊換代重開**新 session，別人會拿到新的 id 重拉。
 */
export function useSfu({ code, meId, liveStatus, media, online, sendMedia }: Input) {
	const [status, setStatus] = useState<VideoStatus>("connecting");
	const [localStream, setLocalStream] = useState<MediaStream | null>(null);
	const [remote, setRemote] = useState<Record<string, MediaStream>>({});
	const [micOn, setMicOn] = useState(true);
	const [camOn, setCamOn] = useState(true);
	/** 遠端 <video> 自動播放被擋（沒有使用者手勢，例如直接開網址）；畫面給一顆按鈕 */
	const [needsGesture, setNeedsGesture] = useState(false);
	const [gestureTick, setGestureTick] = useState(0);
	const conn = useRef<Conn | null>(null);
	const toggles = useRef({ mic: true, cam: true });
	/** 換代：main effect 跟著重跑，舊連線在 cleanup 收掉 */
	const [generation, setGeneration] = useState(0);
	const restart = useCallback(() => setGeneration((n) => n + 1), []);
	const wasOffline = useRef(false);

	// 進房：拿裝置、開 session、推 track
	useEffect(() => {
		let disposed = false;
		let pc: RTCPeerConnection | null = null;
		let local: MediaStream | null = null;

		(async () => {
			try {
				local = await navigator.mediaDevices.getUserMedia({
					audio: true,
					video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: "user" },
				});
			} catch (error) {
				// 拒絕權限是正常路徑，不算例外；沒有裝置 / 被別的程式占用才留痕
				const name = error instanceof Error ? error.name : "";
				if (name !== "NotAllowedError") reportError("video.getUserMedia", error, { code, name });
				if (!disposed) setStatus("denied");
				return;
			}
			if (disposed) return stopAll(local);
			setLocalStream(local);

			const session = await createSession(code);
			if (disposed) return stopAll(local);
			if (!session.ok) {
				if (session.status !== 503) reportError("video.session", session.error, { code, status: session.status });
				setStatus(session.status === 503 ? "unavailable" : "failed");
				return;
			}
			const sessionId = session.data.sessionId;

			pc = new RTCPeerConnection(ICE);
			const c: Conn = {
				pc,
				sessionId,
				local,
				pulled: new Map(),
				midOwner: new Map(),
				queue: Promise.resolve(),
				retries: new Map(),
				generation,
			};
			pc.ontrack = (event) => {
				const mid = event.transceiver.mid;
				const owner = mid ? c.midOwner.get(mid) : undefined;
				if (!owner) return;
				setRemote((r) => {
					const stream = r[owner] ?? new MediaStream();
					stream.addTrack(event.track);
					return { ...r, [owner]: stream };
				});
			};

			// 推：兩條 sendonly transceiver，trackName 就用 kind（session 內唯一即可）
			const transceivers = local.getTracks().map((track) => pc!.addTransceiver(track, { direction: "sendonly" }));
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			const pushed = await newTracks(code, sessionId, {
				sessionDescription: { type: "offer", sdp: pc.localDescription!.sdp },
				tracks: transceivers.map((t) => ({ location: "local", mid: t.mid!, trackName: t.sender.track!.kind })),
			});
			if (disposed) return;
			if (!pushed.ok || !pushed.data.sessionDescription) {
				reportError("video.push", pushed.ok ? "no answer" : pushed.error, { code, sessionId, status: pushed.ok ? 200 : pushed.status });
				setStatus("failed");
				return;
			}
			await pc.setRemoteDescription(pushed.data.sessionDescription);
			const connected = await waitConnected(pc);
			if (disposed) return;
			if (!connected) {
				reportError("video.ice", `iceConnectionState=${pc.iceConnectionState}`, { code, sessionId });
				setStatus("failed");
				return;
			}
			// 連上 ≠ 在送。先確定兩條 track 都有封包出去，別人來拉才不會撞到 empty_track_error
			await waitSending(pc);
			if (disposed) return;
			conn.current = c;
			setStatus("live");
			sendMedia({ sessionId, mic: toggles.current.mic, cam: toggles.current.cam });
		})().catch((error: unknown) => {
			reportError("video.connect", error, { code });
			if (!disposed) setStatus("failed");
		});

		return () => {
			disposed = true;
			const c = conn.current;
			for (const timer of c?.retries.values() ?? []) clearTimeout(timer);
			conn.current = null;
			pc?.close();
			stopAll(local);
			setLocalStream(null);
			setRemote({});
			setStatus("connecting");
		};
		// sendMedia 是穩定的 useCallback；meId 換人代表整個 provider 重掛；generation 變 = 主動重開
	}, [code, sendMedia, generation]);

	// live WS 斷過再連上：api 可能重啟過（session 擁有者對照沒了）、hub 也是新的 client → 整個視訊換代重開
	useEffect(() => {
		if (liveStatus === "offline" || liveStatus === "error") {
			wasOffline.current = true;
			return;
		}
		if (liveStatus !== "online") return;
		if (wasOffline.current) {
			wasOffline.current = false;
			if (conn.current) restart();
			return;
		}
		// 第一次連上（或連上時視訊已經 live）：把狀態送一次
		const c = conn.current;
		if (c) sendMedia({ sessionId: c.sessionId, mic: toggles.current.mic, cam: toggles.current.cam });
	}, [liveStatus, sendMedia, restart]);

	// 照單拉 / 關：別人的 session 變了、上線、離線
	useEffect(() => {
		const c = conn.current;
		if (!c || status !== "live") return;
		const run = (job: () => Promise<void>) => {
			c.queue = c.queue.then(job).catch((error: unknown) => reportError("video.negotiate", error, { code, sessionId: c.sessionId }));
		};

		/** 拉不到就排下一次；排程到了再進 queue，避免卡住別人的 renegotiation */
		const scheduleRetry = (userId: string, sessionId: string, attempt: number) => {
			const wait = PULL_RETRY_MS[Math.min(attempt, PULL_RETRY_MS.length - 1)];
			clearTimeout(c.retries.get(userId));
			c.retries.set(
				userId,
				setTimeout(() => {
					c.retries.delete(userId);
					if (conn.current !== c) return;
					// 這段時間對方可能又換了 session，以最新的為準（media effect 會另外處理）
					if (c.pulled.get(userId)?.sessionId !== sessionId) return;
					run(async () => {
						await unpull(c, userId, code, setRemote);
						await pull(c, userId, sessionId, code, attempt + 1, scheduleRetry, restart);
					});
				}, wait),
			);
		};

		for (const [userId, state] of Object.entries(media)) {
			if (userId === meId || !online.includes(userId) || !state.sessionId) continue;
			const have = c.pulled.get(userId);
			if (have?.sessionId === state.sessionId) continue;
			const target = state.sessionId;
			run(async () => {
				if (have) await unpull(c, userId, code, setRemote);
				await pull(c, userId, target, code, 0, scheduleRetry, restart);
			});
		}
		for (const [userId, have] of c.pulled) {
			const state = media[userId];
			if (online.includes(userId) && state?.sessionId === have.sessionId) continue;
			clearTimeout(c.retries.get(userId));
			c.retries.delete(userId);
			run(() => unpull(c, userId, code, setRemote));
		}
	}, [media, online, status, meId, code, restart]);

	const setMic = useCallback(
		(on: boolean) => {
			toggles.current.mic = on;
			setMicOn(on);
			const c = conn.current;
			for (const t of c?.local.getAudioTracks() ?? []) t.enabled = on;
			if (c) sendMedia({ sessionId: c.sessionId, mic: on, cam: toggles.current.cam });
		},
		[sendMedia],
	);
	const setCam = useCallback(
		(on: boolean) => {
			toggles.current.cam = on;
			setCamOn(on);
			const c = conn.current;
			for (const t of c?.local.getVideoTracks() ?? []) t.enabled = on;
			if (c) sendMedia({ sessionId: c.sessionId, mic: toggles.current.mic, cam: on });
		},
		[sendMedia],
	);
	const toggleMic = useCallback(() => setMic(!toggles.current.mic), [setMic]);
	const toggleCam = useCallback(() => setCam(!toggles.current.cam), [setCam]);

	/** <video>.play() 被擋時 VideoGrid 呼叫；使用者點了按鈕就再試一次 */
	const blocked = useCallback(() => setNeedsGesture(true), []);
	const resume = useCallback(() => {
		setNeedsGesture(false);
		setGestureTick((n) => n + 1);
	}, []);

	return { status, localStream, remote, micOn, camOn, toggleMic, toggleCam, needsGesture, gestureTick, blocked, resume };
}

function stopAll(stream: MediaStream | null) {
	for (const t of stream?.getTracks() ?? []) t.stop();
}

function waitConnected(pc: RTCPeerConnection): Promise<boolean> {
	return new Promise((resolve) => {
		const done = (ok: boolean) => {
			clearTimeout(timer);
			pc.removeEventListener("iceconnectionstatechange", check);
			resolve(ok);
		};
		const check = () => {
			if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") done(true);
			else if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") done(false);
		};
		const timer = setTimeout(() => done(false), CONNECT_TIMEOUT_MS);
		pc.addEventListener("iceconnectionstatechange", check);
		check();
	});
}

/** Cloudflare 回了 offer（拉 / 關之後常常要）就答 answer 交回去 */
async function applyRenegotiation(c: Conn, code: string, response: TracksResponse) {
	if (!response.requiresImmediateRenegotiation || !response.sessionDescription) return;
	await c.pc.setRemoteDescription(response.sessionDescription);
	const answer = await c.pc.createAnswer();
	await c.pc.setLocalDescription(answer);
	await renegotiate(code, c.sessionId, { type: "answer", sdp: c.pc.localDescription!.sdp });
}

async function pull(
	c: Conn,
	userId: string,
	sessionId: string,
	code: string,
	attempt: number,
	scheduleRetry: (userId: string, sessionId: string, attempt: number) => void,
	restart: () => void,
) {
	const result = await newTracks(code, c.sessionId, {
		tracks: TRACK_NAMES.map((trackName) => ({ location: "remote", sessionId, trackName })),
	});
	if (!result.ok) {
		// api 不認我的 session（重啟過）→ 整個重開；不認對方的 session → 等他重新廣播，不用管
		if (result.status === 403 && result.error === "notYourSession") return restart();
		if (result.status === 400) return;
		reportError("video.pull", result.error, { code, sessionId: c.sessionId, from: sessionId, status: result.status });
		return;
	}
	const mids: string[] = [];
	let transient = false;
	for (const t of result.data.tracks ?? []) {
		if (t.errorCode) {
			const detail = `${t.errorCode}: ${t.errorDescription ?? ""}`;
			if (TRANSIENT_TRACK_ERRORS.has(t.errorCode) && attempt < PULL_RETRY_MS.length) {
				transient = true;
				console.warn(`[video.pull] ${detail} (retry ${attempt + 1})`, { from: sessionId, trackName: t.trackName });
			} else {
				reportError("video.pull.track", detail, { code, from: sessionId, trackName: t.trackName, attempt });
			}
			continue;
		}
		if (t.mid) {
			mids.push(t.mid);
			// ontrack 會在 setRemoteDescription 期間觸發，要先登記 mid 是誰的
			c.midOwner.set(t.mid, userId);
		}
	}
	c.pulled.set(userId, { sessionId, mids, attempt });
	await applyRenegotiation(c, code, result.data);
	if (transient) scheduleRetry(userId, sessionId, attempt);
}

/** ICE 連上之後，等兩條 track 都真的送出封包（getStats 的 outbound-rtp）；最多等 5 秒，超過就照樣廣播 */
async function waitSending(pc: RTCPeerConnection): Promise<void> {
	const deadline = Date.now() + SENDING_TIMEOUT_MS;
	const kinds = new Set(pc.getSenders().map((s) => s.track?.kind).filter((k): k is string => !!k));
	while (Date.now() < deadline) {
		const sending = new Set<string>();
		const stats = await pc.getStats();
		stats.forEach((report) => {
			if (report.type === "outbound-rtp" && typeof report.packetsSent === "number" && report.packetsSent > 0 && typeof report.kind === "string") {
				sending.add(report.kind);
			}
		});
		if ([...kinds].every((k) => sending.has(k))) return;
		await new Promise((r) => setTimeout(r, 200));
	}
}

async function unpull(c: Conn, userId: string, code: string, setRemote: (f: (r: Record<string, MediaStream>) => Record<string, MediaStream>) => void) {
	const have = c.pulled.get(userId);
	if (!have) return;
	c.pulled.delete(userId);
	for (const mid of have.mids) c.midOwner.delete(mid);
	setRemote((r) => Object.fromEntries(Object.entries(r).filter(([id]) => id !== userId)));
	if (!have.mids.length) return;
	const result = await closeTracks(code, c.sessionId, { tracks: have.mids.map((mid) => ({ mid })), force: true });
	if (result.ok) await applyRenegotiation(c, code, result.data);
	else reportError("video.close", result.error, { code, sessionId: c.sessionId, status: result.status });
}
