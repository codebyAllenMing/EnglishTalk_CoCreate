"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TimerState } from "@monstertalk/live/timer";
import { wsUrl } from "@/api";
import { toHHMM, type ChatMessage } from "./roomData";

export type LiveStatus = "connecting" | "online" | "offline" | "error";

/** 跟 packages/live 的 protocol.ts 同形狀（server 那邊的 at 是 ISO，這裡轉成畫面用的 "HH:MM"） */
type WireMessage = { id: string; from: string; at: string; text: string };
type ServerMessage =
	| { type: "hello"; you: string; online: string[]; history: WireMessage[]; timer: TimerState; now: number }
	| { type: "chat"; message: WireMessage }
	| { type: "presence"; online: string[] }
	| { type: "timer"; timer: TimerState };

const MAX_FAILURES = 5;
const BACKOFF_MS = [1000, 2000, 4000, 8000];

/**
 * 房間的即時通道（聊天 + 在線名單 + 計時器）。連 `/api/rooms/:code/live`，握手用 cookie，server 那邊查子單與時間窗。
 *
 * - 送出不先塞本地，等 server 廣播回來才出現：一份來源，順序跟大家一致。
 * - 斷線退避重連（1、2、4、8 秒），重連後再收一次 hello，歷史整份換掉；連續失敗五次就放棄，status = error。
 * - 收到 `hello` 之前 status 是 connecting，輸入框鎖著。
 * - 計時器：server 是權威時鐘，這裡只存它最後一次廣播的狀態（timer）與時差（offset = server now − 本機 now）。
 *   剩幾秒由 RoomProvider 用 settle() 從 `Date.now() + offset` 推，server 平常不送任何東西。
 */
export function useLive(code: string) {
	const [status, setStatus] = useState<LiveStatus>("connecting");
	const [online, setOnline] = useState<string[]>([]);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	/** null = 還沒收到 hello */
	const [timer, setTimer] = useState<TimerState | null>(null);
	const [offset, setOffset] = useState(0);
	const socketRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		let disposed = false;
		let failures = 0;
		let timer: ReturnType<typeof setTimeout> | null = null;
		let socket: WebSocket | null = null;

		const connect = () => {
			if (disposed) return;
			setStatus("connecting");
			socket = new WebSocket(wsUrl(`/api/rooms/${encodeURIComponent(code)}/live`));
			socketRef.current = socket;
			let gotHello = false;

			socket.onmessage = (event) => {
				let data: ServerMessage;
				try {
					data = JSON.parse(String(event.data));
				} catch {
					return;
				}
				if (data.type === "hello") {
					gotHello = true;
					failures = 0;
					setOnline(data.online);
					setMessages(data.history.map(fromWire));
					setOffset(data.now - Date.now());
					setTimer(data.timer);
					setStatus("online");
				} else if (data.type === "chat") {
					setMessages((m) => [...m, fromWire(data.message)]);
				} else if (data.type === "presence") {
					setOnline(data.online);
				} else if (data.type === "timer") {
					setTimer(data.timer);
				}
			};
			socket.onclose = () => {
				// ⚠️ 只清掉自己：dev 的 StrictMode 會把 effect 跑兩次，第一條 socket 的 onclose 是在第二條已經接上之後
				//    才觸發的，無條件清成 null 會把活著的那條蓋掉 —— 畫面顯示已連線、送出卻沒反應（2026-09-22 踩到）
				if (socketRef.current === socket) socketRef.current = null;
				if (disposed) return;
				// 握手被拒（401 / 403 / 404 / 410）也會走到這裡，跟斷線一樣退避重試，五次就放棄
				failures = gotHello ? 1 : failures + 1;
				if (failures > MAX_FAILURES) {
					setStatus("error");
					return;
				}
				setStatus("offline");
				timer = setTimeout(connect, BACKOFF_MS[Math.min(failures - 1, BACKOFF_MS.length - 1)]);
			};
		};
		connect();

		return () => {
			disposed = true;
			if (timer) clearTimeout(timer);
			socket?.close();
			if (socketRef.current === socket) socketRef.current = null;
		};
	}, [code]);

	const send = useCallback((text: string) => {
		const value = text.trim();
		const socket = socketRef.current;
		if (!value || !socket || socket.readyState !== WebSocket.OPEN) return;
		socket.send(JSON.stringify({ type: "chat", text: value }));
	}, []);

	/** 按 ⇄：只送出去，狀態等 server 廣播回來（再按一次 server 會當成取消） */
	const swap = useCallback(() => {
		const socket = socketRef.current;
		if (!socket || socket.readyState !== WebSocket.OPEN) return;
		socket.send(JSON.stringify({ type: "swap" }));
	}, []);

	return { status, online, messages, timer, offset, send, swap };
}

function fromWire(m: WireMessage): ChatMessage {
	return { id: m.id, from: m.from, at: toHHMM(new Date(m.at)), text: m.text };
}
