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

type Pulled = { sessionId: string; mids: string[] };

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
};

const ICE = { iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }], bundlePolicy: "max-bundle" as const };
const CONNECT_TIMEOUT_MS = 15_000;
const TRACK_NAMES = ["audio", "video"] as const;

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
			const c: Conn = { pc, sessionId, local, pulled: new Map(), midOwner: new Map(), queue: Promise.resolve() };
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
			conn.current = c;
			setStatus("live");
			sendMedia({ sessionId, mic: toggles.current.mic, cam: toggles.current.cam });
		})().catch((error: unknown) => {
			reportError("video.connect", error, { code });
			if (!disposed) setStatus("failed");
		});

		return () => {
			disposed = true;
			conn.current = null;
			pc?.close();
			stopAll(local);
			setLocalStream(null);
			setRemote({});
		};
		// sendMedia 是穩定的 useCallback；meId 換人代表整個 provider 重掛
	}, [code, sendMedia]);

	// live 重連後 hub 是新的 client 物件，狀態要再送一次
	useEffect(() => {
		const c = conn.current;
		if (liveStatus === "online" && c) sendMedia({ sessionId: c.sessionId, mic: toggles.current.mic, cam: toggles.current.cam });
	}, [liveStatus, sendMedia]);

	// 照單拉 / 關：別人的 session 變了、上線、離線
	useEffect(() => {
		const c = conn.current;
		if (!c || status !== "live") return;
		const run = (job: () => Promise<void>) => {
			c.queue = c.queue.then(job).catch((error: unknown) => reportError("video.negotiate", error, { code, sessionId: c.sessionId }));
		};

		for (const [userId, state] of Object.entries(media)) {
			if (userId === meId || !online.includes(userId) || !state.sessionId) continue;
			const have = c.pulled.get(userId);
			if (have?.sessionId === state.sessionId) continue;
			const target = state.sessionId;
			run(async () => {
				if (have) await unpull(c, userId, code, setRemote);
				await pull(c, userId, target, code);
			});
		}
		for (const [userId, have] of c.pulled) {
			const state = media[userId];
			if (online.includes(userId) && state?.sessionId === have.sessionId) continue;
			run(() => unpull(c, userId, code, setRemote));
		}
	}, [media, online, status, meId, code]);

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

async function pull(c: Conn, userId: string, sessionId: string, code: string) {
	const result = await newTracks(code, c.sessionId, {
		tracks: TRACK_NAMES.map((trackName) => ({ location: "remote", sessionId, trackName })),
	});
	if (!result.ok) {
		reportError("video.pull", result.error, { code, sessionId: c.sessionId, from: sessionId, status: result.status });
		return;
	}
	const mids: string[] = [];
	for (const t of result.data.tracks ?? []) {
		if (t.errorCode) {
			reportError("video.pull.track", `${t.errorCode}: ${t.errorDescription ?? ""}`, { code, from: sessionId, trackName: t.trackName });
			continue;
		}
		if (t.mid) {
			mids.push(t.mid);
			// ontrack 會在 setRemoteDescription 期間觸發，要先登記 mid 是誰的
			c.midOwner.set(t.mid, userId);
		}
	}
	c.pulled.set(userId, { sessionId, mids });
	await applyRenegotiation(c, code, result.data);
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
