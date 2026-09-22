"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getSession } from "./client";
import { readNext, safeNext } from "./next";

type Props = { locale: string };

/**
 * 入口守門的「已登入」那一半：掛在根 layout，一進站打一次 `get-session`，
 * 有 session 而人在**公開頁**（landing、login、signup）就送去 /home（或 `?next=` 指定的頁）。
 * 使用者 2026-09-22 定案：已登入的人不給看 landing（「看這頁沒意義」）；用 replace 不留歷史，防止上一頁繞回。
 *
 * 另一半（(app) 底下沒 session → login）在 SessionProvider，它還負責把 user 給頁面用，方向相反、共用不了。
 * 靜態匯出沒有 middleware，只能在瀏覽器裡問 API「我是誰」。
 *
 * 公開頁照常先畫、不等查詢結果 —— 等的話首次 render 是空白，跟靜態 HTML 對不上；
 * 已登入的人會看到頁面一瞬間再被送走，跟沒登入的人在 /home 看到骨架一瞬間是對稱的。
 * 連不到 API 不做事。非公開頁什麼都不做，避免跟 SessionProvider 重複打一次。
 */
export default function SignedInRedirect({ locale }: Props) {
	const router = useRouter();
	const pathname = usePathname();
	const isPublic = isPublicPath(pathname, locale);

	useEffect(() => {
		if (!isPublic) return;
		let cancelled = false;
		getSession().then(
			(user) => {
				if (!cancelled && user) router.replace(safeNext(readNext(), locale, `/${locale}/home`));
			},
			() => undefined,
		);
		return () => {
			cancelled = true;
		};
	}, [isPublic, locale, router]);

	return null;
}

function isPublicPath(pathname: string, locale: string): boolean {
	const trimmed = pathname.replace(/\/+$/, "");
	return trimmed === `/${locale}` || trimmed === `/${locale}/login` || trimmed === `/${locale}/signup`;
}
