"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getSession, type SessionUser } from "./client";

export type SessionState =
	/** 第一次 render 與查詢中：server HTML 與 client 首次 render 都是這個，不會 hydration mismatch */
	| { status: "checking"; user: null }
	| { status: "signedIn"; user: SessionUser }
	/** 連不到 API。刻意不當成「沒登入」，見下方說明 */
	| { status: "unreachable"; user: null };

type SessionContextValue = SessionState & {
	/** 跳過 cookie 快取重讀一次（改完 name 之後用） */
	refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue>({
	status: "checking",
	user: null,
	refresh: async () => undefined,
});

export function useSession(): SessionContextValue {
	return useContext(SessionContext);
}

type Props = { locale: string; children: ReactNode };

/**
 * 登入後區域的 session 守門，掛在 app/[lang]/(app)/layout.tsx。
 *
 * 靜態匯出沒有 middleware，所以只能在瀏覽器裡問 API「我是誰」，沒登入就導去 login。
 * **這是體驗不是安全** —— 頁面的 HTML 本來就是公開的靜態檔，安全在 API 的 401。
 *
 * children 一律先 render、不等查詢結果：等的話得先渲染空白，而空白跟 server 端的
 * 靜態 HTML 對不上（hydration mismatch），也會讓每次進頁都閃一下。目前頁面內容全是
 * 假資料，沒有東西需要藏。
 *
 * 連不到 API（dev 沒開 api、GitHub Pages 沒有後端）不導走：導去 login 也只會在那裡再失敗一次，
 * 不如讓人繼續看 mock；狀態記成 unreachable，用 session 的元件自己決定怎麼顯示。
 */
export default function SessionProvider({ locale, children }: Props) {
	const router = useRouter();
	const [state, setState] = useState<SessionState>({ status: "checking", user: null });

	useEffect(() => {
		let cancelled = false;
		getSession().then(
			(user) => {
				if (cancelled) return;
				if (user) setState({ status: "signedIn", user });
				else router.replace(`/${locale}/login`);
			},
			() => {
				if (!cancelled) setState({ status: "unreachable", user: null });
			},
		);
		return () => {
			cancelled = true;
		};
	}, [locale, router]);

	const refresh = useCallback(async () => {
		const user = await getSession({ fresh: true }).catch(() => null);
		if (user) setState({ status: "signedIn", user });
	}, []);

	return <SessionContext value={{ ...state, refresh }}>{children}</SessionContext>;
}
