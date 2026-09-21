"use client";

import { ChevronUp, MousePointer2, PenLine, Redo2, Type, Undo2, type LucideIcon } from "lucide-react";
import Card from "@/Components/UI/Card";
import type { Dictionary } from "@/dictionaries";
import { useRoom } from "./RoomProvider";

type Props = { dict: Dictionary["room"]["board"] };

/**
 * 白板 —— **佔位**。
 *
 * 盤點（tech-inventory C2）已定不自建；Excalidraw / tldraw 二選一由使用者決定，
 * 選了就把 <Canvas> 換成嵌入的那個。工具列是純視覺，畫布是幾筆 SVG。
 * 沒有為了 mock 自己寫 canvas 畫筆 —— 那是會被丟掉的程式碼。
 *
 * 收合狀態由 RoomProvider 管，底部的「Whiteboard」按鈕跟這裡的 ▾ 是同一個開關。
 */
export default function Whiteboard({ dict }: Props) {
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

			{whiteboardOpen && (
				<div className="mt-3 flex gap-2">
					<div className="flex shrink-0 flex-col gap-1 rounded-xl border border-ink-100 p-1">
						<Tool icon={MousePointer2} label={dict.tools.select} />
						<Tool icon={PenLine} label={dict.tools.pen} active />
						<Tool icon={Type} label={dict.tools.text} />
						<span className="my-0.5 border-t border-ink-100" />
						<Tool icon={Undo2} label={dict.tools.undo} />
						<Tool icon={Redo2} label={dict.tools.redo} muted />
					</div>
					<Canvas />
				</div>
			)}
		</Card>
	);
}

function Tool({ icon: Icon, label, active, muted }: { icon: LucideIcon; label: string; active?: boolean; muted?: boolean }) {
	return (
		<span
			title={label}
			className={`flex size-8 items-center justify-center rounded-lg ${
				active ? "bg-primary-50 text-primary-600" : muted ? "text-ink-200" : "text-ink-500"
			}`}
		>
			<Icon aria-hidden="true" className="size-4" />
		</span>
	);
}

/** 假畫布：設計稿上那幾筆的示意，等白板套件定案就整個換掉 */
function Canvas() {
	return (
		<svg
			viewBox="0 0 900 200"
			role="img"
			aria-hidden="true"
			className="h-40 w-full rounded-xl border border-ink-100 bg-surface sm:h-48"
			preserveAspectRatio="xMidYMid slice"
		>
			<g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
				<text x="40" y="52" fill="#0d1852" fontFamily="var(--font-nunito), sans-serif" fontSize="26" fontWeight="800">
					Weekend plans?
				</text>
				<path d="M40 60 h150" stroke="#6948dc" strokeWidth="2.5" />
				<g fill="#0d1852" fontFamily="var(--font-nunito), sans-serif" fontSize="19" fontWeight="700">
					<text x="60" y="100">• brunch</text>
					<text x="60" y="132">• movies</text>
					<text x="60" y="164">• hiking</text>
				</g>
				<path d="M360 40 q60 -30 130 -10 q40 10 30 50 q-10 45 -70 55 q-70 10 -100 -25 q-15 -35 10 -70 z" stroke="#6948dc" />
				<g fill="#6948dc" fontFamily="var(--font-nunito), sans-serif" fontSize="17" fontWeight="700">
					<text x="395" y="78">We should</text>
					<text x="392" y="102">try that new</text>
					<text x="386" y="126">bubble tea shop!</text>
				</g>
				<path d="M600 60 q30 -20 60 0 q20 15 0 40" stroke="#fd6078" />
				<path d="M660 140 c15 -20 40 -20 45 0 c5 20 -20 30 -45 40 c-25 -10 -50 -20 -45 -40 c5 -20 30 -20 45 0 z" stroke="#fd6078" />
				<text x="700" y="70" fill="#0d1852" fontFamily="var(--font-noto-tc), sans-serif" fontSize="22" fontWeight="700">聽起來很棒！</text>
				<text x="700" y="105" fill="#0d1852" fontFamily="var(--font-nunito), sans-serif" fontSize="17" fontWeight="700">Sounds awesome!</text>
			</g>
		</svg>
	);
}
