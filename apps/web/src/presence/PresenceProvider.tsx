"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/auth/SessionProvider";
import { beaconLeave, leavePresence, sendHeartbeat, type PresenceState } from "./client";

type PresenceContextValue = {
	/** 登出前呼叫：立刻從線上名單消失，不等 TTL */
	leave: () => Promise<void>;
	/** 未讀通知數，每次心跳回來更新；鈴鐺打開後自己歸零 */
	unread: number;
	setUnread: (count: number) => void;
};

const PresenceContext = createContext<PresenceContextValue>({
	leave: async () => undefined,
	unread: 0,
	setUnread: () => undefined,
});

export function usePresence(): PresenceContextValue {
	return useContext(PresenceContext);
}

/** 沒鍵盤滑鼠這麼久就算 idle */
const IDLE_MS = 5 * 60 * 1000;
/** 心跳間隔；server 端 TTL 是兩分鐘，留一次失誤的餘裕 */
const HEARTBEAT_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "touchstart", "scroll"] as const;

/**
 * 自己的線上狀態，掛在 (app)/layout.tsx。
 *
 * 狀態機：active ─(5 分鐘沒動作，或分頁切到背景)→ idle ─(有動作 / 回前景)→ active；
 * 離線不用主動報，心跳停了 server 端 TTL 到就消失。登出與關分頁例外，立刻送 leave。
 *
 * 自己的狀態全部用 ref 不用 state：只有 server 需要知道，畫面不畫，沒必要為它 re-render。
 * 唯一的 state 是心跳帶回來的未讀通知數（鈴鐺的徽章），數字沒變 setState 會略過、不重繪。
 * 只在 session 確認登入後才開始打，沒登入的心跳只會拿 401。
 */
export default function PresenceProvider({ children }: { children: ReactNode }) {
	const { status } = useSession();
	const state = useRef<PresenceState>("active");
	const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [unread, setUnread] = useState(0);

	useEffect(() => {
		if (status !== "signedIn") return;

		const beat = () =>
			void sendHeartbeat(state.current).then((count) => {
				if (count !== null) setUnread(count);
			});
		const setState = (next: PresenceState) => {
			if (state.current === next) return;
			state.current = next;
			beat(); // 狀態一變立刻報，不等下一次心跳
		};
		const armIdleTimer = () => {
			if (idleTimer.current) clearTimeout(idleTimer.current);
			idleTimer.current = setTimeout(() => setState("idle"), IDLE_MS);
		};
		const onActivity = () => {
			if (document.visibilityState !== "visible") return;
			setState("active");
			armIdleTimer();
		};
		const onVisibility = () => {
			if (document.visibilityState === "visible") onActivity();
			else setState("idle");
		};

		state.current = document.visibilityState === "visible" ? "active" : "idle";
		beat();
		armIdleTimer();
		const interval = setInterval(beat, HEARTBEAT_MS);
		for (const event of ACTIVITY_EVENTS) window.addEventListener(event, onActivity, { passive: true });
		document.addEventListener("visibilitychange", onVisibility);
		window.addEventListener("pagehide", beaconLeave);

		return () => {
			clearInterval(interval);
			if (idleTimer.current) clearTimeout(idleTimer.current);
			for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, onActivity);
			document.removeEventListener("visibilitychange", onVisibility);
			window.removeEventListener("pagehide", beaconLeave);
		};
	}, [status]);

	const leave = useCallback(async () => {
		await leavePresence();
	}, []);

	return <PresenceContext value={{ leave, unread, setUnread }}>{children}</PresenceContext>;
}
