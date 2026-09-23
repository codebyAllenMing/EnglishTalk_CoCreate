import type { TimerState } from "./timer.ts";

/**
 * 房間即時通道的協定（JSON）。前端 apps/web 的 useLive 照這份解，兩邊一起改。
 * 一條連線多路復用（使用者 2026-09-22：「一次開太多 ws 對瀏覽器並不太友善」），server 用 `type` 分流。
 *
 *   client → server   { type: "chat", text }
 *                     { type: "swap" }                            按 ⇄（再按一次 = 取消排程中的切換）
 *                     { type: "media", media }                    我的視訊狀態：SFU sessionId、mic / cam 開關（推完 track 或切開關時送）
 *                     { type: "ping" }                            keepalive：前端每 30 秒送一次（見下）
 *   server → client   { type: "hello", you, online, history, timer, now, media }
 *                                                                 連上第一包；晚進來的從 history 拿到之前的訊息，
 *                                                                 timer 是計時器狀態、now 是 server 此刻（ms，client 算時差），
 *                                                                 media 是目前在線每個人的視訊狀態（照單去拉 track）
 *                     { type: "chat", message }                 廣播含自己；前端等這包回來才顯示
 *                     { type: "presence", online }              有人進出
 *                     { type: "timer", timer }                  計時器狀態變了（swap / 取消 / 換桶 / 結束）；平常不送
 *                     { type: "media", user, media }            某人的視訊狀態變了
 *                     { type: "pong" }                          回 ping；前端不用理
 *
 * keepalive（2026-09-23）：Cloudflare 對閒置 WebSocket 有 100 秒逾時，這條連線沒人打字就沒封包，
 * 經 tunnel 上線後每 130 秒被切一次、視訊跟著重開。ping / pong 讓兩個方向每 30 秒都有一個 frame。
 * dev 直連沒差；tldraw 的白板連線自己會 ping 所以沒事。
 *
 * 視訊媒體本身走 Cloudflare Realtime SFU，這條只交換「誰的 session 是哪個、開關如何」。
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

/** 某人在 SFU 的狀態。sessionId null = 還沒推（沒鏡頭權限、視訊未設定…），別人就畫頭像 */
export type MediaState = { sessionId: string | null; mic: boolean; cam: boolean };

export type ClientMessage =
	| { type: "chat"; text: string }
	| { type: "swap" }
	| { type: "media"; media: MediaState }
	| { type: "ping" };

export type ServerMessage =
	| {
			type: "hello";
			you: string;
			online: string[];
			history: ChatMessage[];
			timer: TimerState;
			now: number;
			/** userId → 狀態；只有送過 media 的人在裡面 */
			media: Record<string, MediaState>;
	  }
	| { type: "chat"; message: ChatMessage }
	| { type: "presence"; online: string[] }
	| { type: "timer"; timer: TimerState }
	| { type: "media"; user: string; media: MediaState }
	| { type: "pong" };
