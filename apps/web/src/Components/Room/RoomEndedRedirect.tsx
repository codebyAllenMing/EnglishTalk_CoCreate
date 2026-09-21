"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useRoom } from "./RoomProvider";

/**
 * 兩桶都跑完 → 房間結束 → 整頁換到 /home，並帶 ?ended=房號 讓首頁彈「已結束」。
 *
 * 用 replace 不用 push：結束的房間不該留在歷史紀錄裡，按上一頁回來會是一個
 * 已經停在 0:00 的死房。彈窗放在首頁那邊（RoomEndedNotice）而不是這裡 ——
 * 使用者 2026-09-21：「背景就被彈跳到 home」，房間結束就不該還站在房間裡。
 */
export default function RoomEndedRedirect({ locale, code }: { locale: string; code: string }) {
	const { timer } = useRoom();
	const router = useRouter();

	useEffect(() => {
		if (timer.ended) router.replace(`/${locale}/home?ended=${encodeURIComponent(code)}`);
	}, [timer.ended, locale, code, router]);

	return null;
}
