import type { TimerState } from "./timer.ts";

/**
 * 房間即時通道的協定（JSON）。前端 apps/web 的 useLive 照這份解，兩邊一起改。
 * 一條連線多路復用（使用者 2026-09-22：「一次開太多 ws 對瀏覽器並不太友善」），server 用 `type` 分流。
 *
 *   client → server   { type: "chat", text }
 *                     { type: "swap" }                            按 ⇄（再按一次 = 取消排程中的切換）
 *   server → client   { type: "hello", you, online, history, timer, now }
 *                                                                 連上第一包；晚進來的從 history 拿到之前的訊息，
 *                                                                 timer 是計時器狀態、now 是 server 此刻（ms，client 算時差）
 *                     { type: "chat", message }                 廣播含自己；前端等這包回來才顯示
 *                     { type: "presence", online }              有人進出
 *                     { type: "timer", timer }                  計時器狀態變了（swap / 取消 / 換桶 / 結束）；平常不送
 *
 * 之後反應（emoji）也走這條，多加 type 就好，不用再開連線。
 */
export type LiveUser = { id: string; name: string; avatar: string; lang: string };

export type ChatMessage = {
	id: string;
	/** userId */
	from: string;
	/** server 時間，ISO */
	at: string;
	text: string;
};

export type ClientMessage = { type: "chat"; text: string } | { type: "swap" };

export type ServerMessage =
	| { type: "hello"; you: string; online: string[]; history: ChatMessage[]; timer: TimerState; now: number }
	| { type: "chat"; message: ChatMessage }
	| { type: "presence"; online: string[] }
	| { type: "timer"; timer: TimerState };
