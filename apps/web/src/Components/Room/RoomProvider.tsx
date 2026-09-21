"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { LangCode } from "../Profile/profileData";
import { toHHMM, type ChatMessage, type Room, type WordEntry } from "./roomData";

/** 給畫面看的：兩桶各剩幾秒、誰在跑、跑完沒、幾秒後要換 */
type Timer = {
	active: LangCode;
	remaining: Record<LangCode, number>;
	ended: boolean;
	/** 按了 ⇄ 之後的倒數（秒）；null = 沒有排程中的切換 */
	swapIn: number | null;
};

/** 按 ⇄ 到真的換邊的緩衝（使用者 2026-09-21：「不能讓他馬上切，要等個 5 秒」） */
const SWAP_DELAY_MS = 5000;

/**
 * 真正存的狀態。⚠️ **不存「剩幾秒」然後每秒減一** —— 分頁切到背景後瀏覽器會把
 * setInterval 節流到一分鐘一次，減一的計時器回到前景時就少了好幾分鐘。
 * 存的是「在跑的那桶從哪一刻（since）開始、當時還剩幾秒」，剩餘時間隨時
 * 用牆鐘算：remaining - (now - since)。interval 只負責觸發重繪，就算被節流，
 * 回到前景那一刻算出來的數字也是對的。
 *
 * 這跟之後接後端的模型是同一個：server 廣播 switchAt 時間戳，client 拿牆鐘算。
 */
type TimerState = {
	active: LangCode;
	/** 沒在跑的那桶是實際剩餘；在跑的那桶是 since 那一刻的剩餘 */
	remaining: Record<LangCode, number>;
	/**
	 * 在跑那桶開始計的時刻（ms）。用 useState 的初始化函式在 client 填 Date.now()
	 * 不會 hydration mismatch：第一次 render 時 now 還是 null，畫面不看 since。
	 */
	since: number;
	ended: boolean;
	/** 排程中的切換要在哪一刻生效（ms）；null = 沒有 */
	swapAt: number | null;
};

type RoomState = {
	room: Room;
	timer: Timer;
	micOn: boolean;
	camOn: boolean;
	whiteboardOpen: boolean;
	/** participantId → emoji。只有按了才出現，三秒後消失 */
	reactions: Record<string, string>;
	messages: ChatMessage[];
	words: WordEntry[];
	topicIndex: number;
};

type RoomActions = {
	swapLang: () => void;
	toggleMic: () => void;
	toggleCam: () => void;
	toggleWhiteboard: () => void;
	react: (emoji: string) => void;
	sendMessage: (text: string) => void;
	saveWord: (entry: Omit<WordEntry, "id">) => void;
	removeWord: (id: string) => void;
	nextTopic: () => void;
};

const RoomContext = createContext<(RoomState & RoomActions) | null>(null);

const REACTION_MS = 3000;

/**
 * 對話室唯一的狀態層。畫面元件全部從這裡拿資料、透過這裡改資料 ——
 * 之後接 LiveKit / WebSocket 是換掉這個檔案裡的資料來源，畫面不動。
 *
 * ## 計時器（照盤點 C1 的原則寫）
 *
 * 開房選 20 / 40 / 60，系統對半切成兩桶。一次只有一桶倒數，⇄ 換桶、沒在跑的
 * 那桶暫停；跑到 0 自動換另一桶，兩桶都 0 就結束。中途換不會重置，總時長永遠
 * 等於開房設的。
 *
 * ⚠️ **「該換了」的判定只在 settle() 一處。** 真的接後端時 server 才是權威時鐘
 *    （廣播 switchAt，client 只渲染倒數不做判定），到時候換掉的是 settle 的依據，
 *    LanguageTimer 只吃 active 與 remaining，不用動。
 *
 * ## 反應
 *
 * **只有按了才出現**（使用者 2026-09-21：不要預先掛在格子上），三秒後消失，
 * 每個人各自計時。mock 只有自己按得到；接了廣播之後別人的也走同一個 showReaction。
 */
export default function RoomProvider({ room, children }: { room: Room; children: ReactNode }) {
	const half = (room.durationMinutes * 60) / 2;
	const me = room.participants.find((p) => p.me);
	if (!me) throw new Error("RoomProvider: room.participants 裡沒有 me");

	const [state, setState] = useState<TimerState>(() => ({
		active: me.lang,
		remaining: { zh: half, en: half },
		since: Date.now(),
		ended: false,
		swapAt: null,
	}));
	// 只是重繪的觸發器；數字都從牆鐘算，不從它累加
	const [now, setNow] = useState<number | null>(null);
	const [micOn, setMicOn] = useState(true);
	const [camOn, setCamOn] = useState(true);
	const [whiteboardOpen, setWhiteboardOpen] = useState(true);
	const [reactions, setReactions] = useState<Record<string, string>>({});
	const [messages, setMessages] = useState(room.messages);
	const [words, setWords] = useState(room.words);
	const [topicIndex, setTopicIndex] = useState(0);
	const reactionTimeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>());

	useEffect(() => {
		if (state.ended) return;
		const tick = () => {
			const t = Date.now();
			setNow(t);
			setState((s) => settle(s, t));
		};
		const id = setInterval(tick, 1000);
		// 背景分頁的 interval 會被節流；回到前景那一刻立刻對一次時，不等下一個 tick
		document.addEventListener("visibilitychange", tick);
		return () => {
			clearInterval(id);
			document.removeEventListener("visibilitychange", tick);
		};
	}, [state.ended]);

	const timer = view(state, now);

	/**
	 * 按 ⇄：排一個 5 秒後生效的切換，再按一次取消。**不是立刻換** ——
	 * 講到一半被切掉很突兀，5 秒是把話收尾的緩衝。真正換邊在 settle() 裡，
	 * 用排程的時間戳結算，背景分頁回來也算得對。
	 */
	const swapLang = () =>
		setState((t) => {
			if (t.ended) return t;
			if (t.swapAt !== null) return { ...t, swapAt: null };
			const other: LangCode = t.active === "zh" ? "en" : "zh";
			// 另一桶已經空了就沒得換
			if (t.remaining[other] <= 0) return t;
			return { ...t, swapAt: Date.now() + SWAP_DELAY_MS };
		});

	const showReaction = (participantId: string, emoji: string) => {
		setReactions((r) => ({ ...r, [participantId]: emoji }));
		const timeouts = reactionTimeouts.current;
		clearTimeout(timeouts.get(participantId));
		timeouts.set(
			participantId,
			setTimeout(() => {
				setReactions((r) => Object.fromEntries(Object.entries(r).filter(([id]) => id !== participantId)));
				timeouts.delete(participantId);
			}, REACTION_MS),
		);
	};
	const react = (emoji: string) => showReaction(me.id, emoji);

	const sendMessage = (text: string) => {
		const value = text.trim();
		if (!value) return;
		setMessages((m) => [...m, { id: `local-${Date.now()}`, from: me.id, at: toHHMM(new Date()), text: value }]);
	};

	const saveWord = (entry: Omit<WordEntry, "id">) =>
		setWords((w) => [...w, { ...entry, id: `local-${Date.now()}` }]);

	const removeWord = (id: string) => setWords((w) => w.filter((x) => x.id !== id));

	// 隨機但不重複抽到同一張
	const nextTopic = () =>
		setTopicIndex((i) => {
			if (room.topics.length < 2) return i;
			let next = i;
			while (next === i) next = Math.floor(Math.random() * room.topics.length);
			return next;
		});

	return (
		<RoomContext.Provider
			value={{
				room,
				timer,
				micOn,
				camOn,
				whiteboardOpen,
				reactions,
				messages,
				words,
				topicIndex,
				swapLang,
				toggleMic: () => setMicOn((v) => !v),
				toggleCam: () => setCamOn((v) => !v),
				toggleWhiteboard: () => setWhiteboardOpen((v) => !v),
				react,
				sendMessage,
				saveWord,
				removeWord,
				nextTopic,
			}}
		>
			{children}
		</RoomContext.Provider>
	);
}

/** 在跑的那桶此刻剩幾秒（可能是負的 —— 代表已經跑完、超出的秒數要算給另一桶） */
function leftOf(t: TimerState, at: number): number {
	return t.remaining[t.active] - (at - t.since) / 1000;
}

/**
 * 結算：排程的切換到點了就換、在跑的那桶跑完了就換另一桶、兩桶都完就結束。
 * **回傳同一個物件代表沒事**，免得每秒都觸發一次無意義的 state 更新。
 *
 * 換桶時另一桶的 since 是「換邊那一刻」（排程的時間戳、或前一桶剛好歸零的那一刻），
 * 不是 now —— 背景分頁回來時可能已經過了好幾分鐘，那段時間要算進另一桶。
 * 換完遞迴再結算一次：那幾分鐘可能連另一桶也跑完了。
 */
function settle(t: TimerState, at: number): TimerState {
	if (t.ended) return t;
	const other: LangCode = t.active === "zh" ? "en" : "zh";
	const zeroAt = t.since + t.remaining[t.active] * 1000;

	// 排程的切換先到、桶還沒空 → 手動換邊
	if (t.swapAt !== null && t.swapAt <= at && t.swapAt < zeroAt) {
		const swapped: TimerState = {
			active: other,
			remaining: { ...t.remaining, [t.active]: leftOf(t, t.swapAt) },
			since: t.swapAt,
			ended: false,
			swapAt: null,
		};
		return settle(swapped, at);
	}

	if (leftOf(t, at) > 0) return t;

	// 桶空了：排程中的切換作廢（反正要換了）
	const otherLeft = t.remaining[other] - (at - zeroAt) / 1000;
	if (otherLeft <= 0) return { ...t, remaining: { zh: 0, en: 0 }, ended: true, swapAt: null };
	return { active: other, remaining: { ...t.remaining, [t.active]: 0 }, since: zeroAt, ended: false, swapAt: null };
}

/** 給畫面的整數秒；now 還沒有（SSR / 第一次 render）就照 remaining 原樣顯示 */
function view(t: TimerState, now: number | null): Timer {
	const active = now === null ? t.remaining[t.active] : Math.max(0, Math.ceil(leftOf(t, now)));
	const swapIn = t.swapAt === null || now === null ? null : Math.max(0, Math.ceil((t.swapAt - now) / 1000));
	return { active: t.active, remaining: { ...t.remaining, [t.active]: active }, ended: t.ended, swapIn };
}

export function useRoom() {
	const ctx = useContext(RoomContext);
	if (!ctx) throw new Error("useRoom 必須在 RoomProvider 裡面用");
	return ctx;
}
