"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initialTimer, leftOf, settle, type TimerState } from "@monstertalk/live/timer";
import { deleteWord, getRoomWords, saveRoomWord, type SaveWordResult, type WordInput, type WordItem } from "@/words/client";
import type { LangCode } from "../Profile/profileData";
import { parseLocalDateTime, type ChatMessage, type Room } from "./roomData";
import { useLive, type LiveStatus } from "./useLive";

/** 給畫面看的：兩桶各剩幾秒、誰在跑、跑完沒、幾秒後要換 */
type Timer = {
	active: LangCode;
	remaining: Record<LangCode, number>;
	ended: boolean;
	/** 按了 ⇄ 之後的倒數（秒）；null = 沒有排程中的切換 */
	swapIn: number | null;
};

type RoomState = {
	room: Room;
	timer: Timer;
	micOn: boolean;
	camOn: boolean;
	whiteboardOpen: boolean;
	/** participantId → emoji。只有按了才出現，三秒後消失 */
	reactions: Record<string, string>;
	/** 聊天通道的狀態；connecting / offline 時輸入框鎖著 */
	chatStatus: LiveStatus;
	/** 現在連著即時通道的 userId（同一人多分頁算一個） */
	online: string[];
	messages: ChatMessage[];
	/** 這場存的字（自己的），進房拉一次、存 / 刪之後跟著改 */
	words: WordItem[];
	topicIndex: number;
};

type RoomActions = {
	swapLang: () => void;
	toggleMic: () => void;
	toggleCam: () => void;
	toggleWhiteboard: () => void;
	react: (emoji: string) => void;
	sendMessage: (text: string) => void;
	saveWord: (input: WordInput) => Promise<SaveWordResult>;
	removeWord: (id: number) => Promise<void>;
	nextTopic: () => void;
};

const RoomContext = createContext<(RoomState & RoomActions) | null>(null);

const REACTION_MS = 3000;

/**
 * 對話室唯一的狀態層。畫面元件全部從這裡拿資料、透過這裡改資料 ——
 * 聊天與在線名單來自 useLive（自有 WS）、單字來自 /api/rooms/:code/words；之後接 LiveKit 與計時器同步也是換這裡的資料來源，畫面不動。
 *
 * ## 計時器（照盤點 C1 的原則寫；2026-09-22 接 server）
 *
 * 開房選 20 / 40 / 60，系統對半切成兩桶。一次只有一桶倒數，⇄ 換桶、沒在跑的
 * 那桶暫停；跑到 0 自動換另一桶，兩桶都 0 就結束。中途換不會重置，總時長永遠
 * 等於開房設的。
 *
 * **server 是權威時鐘**：狀態（since / remaining / swapAt）來自 useLive 的 hello 與 timer 廣播，
 * 這裡只用共用的 settle()（`@monstertalk/live/timer`）從 `Date.now() + offset` 推出畫面的數字；
 * ⇄ 只送訊息，等 server 廣播回來才變。**不存「剩幾秒」每秒減一** —— 背景分頁的 setInterval
 * 被節流也沒差，interval 只是重繪觸發器。hello 來之前用房間的 startDate / 時長畫占位。
 * LanguageTimer 只吃 active 與 remaining，不用動。
 *
 * ## 反應
 *
 * **只有按了才出現**（使用者 2026-09-21：不要預先掛在格子上），三秒後消失，
 * 每個人各自計時。mock 只有自己按得到；接了廣播之後別人的也走同一個 showReaction。
 */
export default function RoomProvider({ room, children }: { room: Room; children: ReactNode }) {
	const me = room.participants.find((p) => p.me);
	if (!me) throw new Error("RoomProvider: room.participants 裡沒有 me");

	// 只是重繪的觸發器；數字都從牆鐘算，不從它累加
	const [now, setNow] = useState<number | null>(null);
	const [micOn, setMicOn] = useState(true);
	const [camOn, setCamOn] = useState(true);
	const [whiteboardOpen, setWhiteboardOpen] = useState(true);
	const [reactions, setReactions] = useState<Record<string, string>>({});
	const live = useLive(room.code);
	const [words, setWords] = useState<WordItem[]>([]);
	const [topicIndex, setTopicIndex] = useState(0);
	const reactionTimeouts = useRef(new Map<string, ReturnType<typeof setTimeout>>());

	// server 的狀態（hello 來之前先用房間資料畫占位：整桶、不動）
	const base: TimerState =
		live.timer ??
		initialTimer({
			startDate: parseLocalDateTime(room.startsAt).getTime(),
			durationMinutes: room.durationMinutes,
			firstLang: room.firstLang,
		});
	// 用 server 的鐘：本機 now 加時差
	const serverNow = now === null ? null : now + live.offset;
	const state = serverNow === null ? base : settle(base, serverNow);

	useEffect(() => {
		if (state.ended) return;
		const tick = () => setNow(Date.now());
		const id = setInterval(tick, 1000);
		// 背景分頁的 interval 會被節流；回到前景那一刻立刻對一次時，不等下一個 tick
		document.addEventListener("visibilitychange", tick);
		return () => {
			clearInterval(id);
			document.removeEventListener("visibilitychange", tick);
		};
	}, [state.ended]);

	// 這場已經存過的字（重新整理回來還在）。拉不到就空的，存字那一刻會再遇到同樣的錯
	useEffect(() => {
		let stale = false;
		getRoomWords(room.code).then((items) => {
			if (!stale && items) setWords(items);
		});
		return () => {
			stale = true;
		};
	}, [room.code]);

	const timer = view(state, serverNow);

	/**
	 * 按 ⇄：送給 server，server 排一個 5 秒後生效的切換並廣播給全房；再按一次取消。
	 * **不是立刻換** —— 講到一半被切掉很突兀，5 秒是把話收尾的緩衝。
	 */
	const swapLang = live.swap;

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

	// 只送出去，等 server 廣播回來才出現在畫面上（useLive）
	const sendMessage = live.send;

	// 存進 DB 才出現在面板；同一個字存過 server 會擋（duplicate），對話框自己顯示
	const saveWord = async (input: WordInput) => {
		const result = await saveRoomWord(room.code, input);
		if (result.ok) setWords((w) => [...w, result.item]);
		return result;
	};

	const removeWord = async (id: number) => {
		if (await deleteWord(id)) setWords((w) => w.filter((x) => x.id !== id));
	};

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
				chatStatus: live.status,
				online: live.online,
				messages: live.messages,
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

/** 給畫面的整數秒；now 還沒有（SSR / 第一次 render）就照 remaining 原樣顯示。now 是 server 時間 */
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
