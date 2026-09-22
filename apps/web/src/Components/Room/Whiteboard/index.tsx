"use client";

import { ChevronUp, PenLine } from "lucide-react";
import dynamic from "next/dynamic";
import Card from "@/Components/UI/Card";
import type { Dictionary } from "@/dictionaries";
import { useRoom } from "../RoomProvider";

type Props = { code: string; locale: string; dict: Dictionary["room"]["board"] };

/**
 * 白板模組的對外入口：`<Whiteboard code dict />`。
 *
 * 這一層只有外框、標題列與收合（收合狀態由 RoomProvider 管，底部的「Whiteboard」按鈕跟這裡的 ▾ 是同一個開關）。
 * 畫布在 Board.tsx，用 next/dynamic 關掉 SSR 載入 —— tldraw 只能在瀏覽器跑，靜態匯出的 HTML 先給骨架。
 * 換白板引擎、換同步方式都在這個資料夾裡解決，房間頁不用改。
 */
const Board = dynamic(() => import("./Board"), {
	ssr: false,
	loading: () => <div aria-hidden="true" className="h-72 animate-pulse rounded-xl bg-primary-50 sm:h-96" />,
});

export default function Whiteboard({ code, locale, dict }: Props) {
	const { whiteboardOpen, toggleWhiteboard } = useRoom();

	return (
		<Card className="p-3 sm:p-4">
			<div className="flex items-center gap-3">
				<h2 className="flex items-center gap-2 font-extrabold">
					<PenLine aria-hidden="true" className="size-5 text-primary-500" />
					{dict.title}
				</h2>
				<span className="hidden items-center gap-1.5 text-xs text-ink-500 sm:flex">
					<span className="size-2 rounded-full bg-secondary-400" />
					{dict.everyone}
				</span>
				<button
					type="button"
					aria-expanded={whiteboardOpen}
					onClick={toggleWhiteboard}
					className="ml-auto flex items-center gap-1.5 text-sm font-extrabold text-primary-600 transition-colors hover:text-primary-700"
				>
					{whiteboardOpen ? dict.collapse : dict.reopen}
					<ChevronUp aria-hidden="true" className={`size-4 transition-transform ${whiteboardOpen ? "" : "rotate-180"}`} />
				</button>
			</div>

			{/* 收合時整個畫布卸載：連線也跟著斷，重新展開會接回同一塊板子（server 保留 60 秒） */}
			{whiteboardOpen && (
				<div className="mt-3">
					<Board code={code} locale={locale} unavailable={dict.unavailable} />
				</div>
			)}
		</Card>
	);
}
