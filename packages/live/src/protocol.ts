/**
 * 房間即時通道的協定（JSON）。前端 apps/web 的 useLive 照這份解，兩邊一起改。
 *
 *   client → server   { type: "chat", text }
 *   server → client   { type: "hello", you, online, history }   連上第一包；晚進來的從 history 拿到之前的訊息
 *                     { type: "chat", message }                 廣播含自己；前端等這包回來才顯示
 *                     { type: "presence", online }              有人進出
 *
 * 之後計時器（switchAt）與反應（emoji）也走這條，多加 type 就好，不用再開連線。
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

export type ClientMessage = { type: "chat"; text: string };

export type ServerMessage =
	| { type: "hello"; you: string; online: string[]; history: ChatMessage[] }
	| { type: "chat"; message: ChatMessage }
	| { type: "presence"; online: string[] };
