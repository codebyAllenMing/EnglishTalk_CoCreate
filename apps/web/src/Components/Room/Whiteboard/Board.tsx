"use client";

import "tldraw/tldraw.css";
import { useSync } from "@tldraw/sync";
import { useEffect, useMemo, useState } from "react";
import { reportError } from "@/log";
import {
	atom,
	createUserId,
	Tldraw,
	UserRecordType,
	useTldrawCurrentUser,
	type TLUser,
	type TLUserPreferences,
	type TLUserStore,
} from "tldraw";
import { wsUrl } from "@/api";
import { useSession } from "@/auth/SessionProvider";
import { noUploads } from "./assets";

type Props = {
	code: string;
	/** 給 tldraw 的介面語系（zh-TW → zh-tw） */
	locale: string;
	/** 連不上（沒登入、不是成員、不在時間窗、房已取消）時顯示的字 */
	unavailable: string;
};

/** 游標與人員清單的顏色：同一個人永遠同一色，從 userId 雜湊挑 */
const CURSOR_COLORS = ["#6948dc", "#359f95", "#fd6078", "#f4b400", "#2f80ed", "#e67e22"];
function colorFor(id: string): string {
	let h = 0;
	for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
	return CURSOR_COLORS[h % CURSOR_COLORS.length] ?? CURSOR_COLORS[0]!;
}

/**
 * 真正的畫布：tldraw + 官方 sync。連到 api 的 `/api/rooms/:code/whiteboard`，
 * server 那邊一間房一個 TLSocketRoom（packages/whiteboard），握手時驗 session 與子單。
 *
 * ⚠️ 只能在瀏覽器跑（tldraw 要 window、useSync 要 WebSocket），所以由 index.tsx 用 next/dynamic 關掉 SSR 載入。
 * 換 Excalidraw 只動這個檔案，外面的收合、標題列不變。
 */
export default function Board({ code, locale, unavailable }: Props) {
	const { user: me } = useSession();
	const meId = me?.id ?? "anonymous";
	const meName = me?.name ?? "";
	const color = colorFor(meId);

	/*
	 * 兩個地方都要給登入者，缺一不可（使用者 2026-09-22 看到別人是「新用戶」）：
	 *   1. useSync 的 users.currentUser：**廣播給別人的 presence**（游標名字、人員清單）從這裡來；
	 *      沒給的話它讀瀏覽器 localStorage 的預設偏好，名字就是「新用戶」。
	 *   2. <Tldraw user>：編輯器自己的偏好（語系、自己在清單裡的名字）。
	 */
	const users = useMemo<TLUserStore>(
		() => ({
			currentUser: atom<TLUser | null>("whiteboard user", UserRecordType.create({ id: createUserId(meId), name: meName, color })),
		}),
		[meId, meName, color],
	);
	const store = useSync({ uri: wsUrl(`/api/rooms/${encodeURIComponent(code)}/whiteboard`), assets: noUploads, users });
	const [prefs, setPrefs] = useState<TLUserPreferences>(() => ({
		id: meId,
		name: meName,
		color,
		locale: locale.toLowerCase(),
	}));
	const user = useTldrawCurrentUser({ userPreferences: prefs, setUserPreferences: setPrefs });

	// 同步斷了（握手被拒、Cloudflare / api 掛了）留痕；畫面照樣顯示 unavailable
	useEffect(() => {
		if (store.status === "error") reportError("whiteboard.sync", store.error, { code });
	}, [store, code]);

	if (store.status === "error") {
		return (
			<div className="flex h-72 items-center justify-center rounded-xl border border-ink-100 bg-primary-50 px-4 text-center text-sm text-ink-500 sm:h-96">
				{unavailable}
			</div>
		);
	}

	return (
		<div className="h-72 overflow-hidden rounded-xl border border-ink-100 sm:h-96">
			<Tldraw store={store} user={user} />
		</div>
	);
}
