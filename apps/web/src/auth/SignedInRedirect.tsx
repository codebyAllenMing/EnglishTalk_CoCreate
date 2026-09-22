"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSession } from "./client";

type Props = { locale: string };

/**
 * 登入 / 註冊頁的反向守門：已經登入的人打 /login 或 /signup，直接送回 /home。
 * 跟 (app) layout 的 SessionProvider 是同一招反過來用，理由也一樣：
 * 靜態匯出沒有 middleware，只能在瀏覽器裡問 API「我是誰」。
 *
 * 表單照常先畫、不等查詢結果 —— 等的話首次 render 是空白，跟靜態 HTML 對不上；
 * 已登入的人會看到表單一瞬間再被送走，跟沒登入的人在 /home 看到骨架一瞬間是對稱的。
 *
 * 連不到 API 不做事：表單留著，送出時 AuthForm 自己會報 network。
 * 不放進 SessionProvider 是因為那個會把沒登入的人導去 login，兩邊方向相反、共用不了。
 */
export default function SignedInRedirect({ locale }: Props) {
	const router = useRouter();

	useEffect(() => {
		let cancelled = false;
		getSession().then(
			(user) => {
				if (!cancelled && user) router.replace(`/${locale}/home`);
			},
			() => undefined,
		);
		return () => {
			cancelled = true;
		};
	}, [locale, router]);

	return null;
}
