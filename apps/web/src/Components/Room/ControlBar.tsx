"use client";

import { ChevronRight, Mic, MicOff, PenLine, SmilePlus, Video, VideoOff, type LucideIcon } from "lucide-react";
import { useState } from "react";
import type { Dictionary } from "@/dictionaries";
import { useRoom } from "./RoomProvider";

type Props = { dict: Dictionary["room"]["controls"] };

const EMOJIS = ["😍", "👍", "❤️", "🎉", "😂", "🤔"];

/**
 * 底部四顆：Mic / Camera / Whiteboard / Reactions。
 *
 * 前三顆是開關，Reactions 展開一排 emoji。設計稿每顆右邊都有 ›，
 * 暗示之後有子選單（選裝置之類），mock 先當純開關。
 *
 * 窄版固定在畫面底部（視訊通話的控制列離手指要近），lg 以上回到版面裡。
 */
export default function ControlBar({ dict }: Props) {
	const { micOn, camOn, whiteboardOpen, toggleMic, toggleCam, toggleWhiteboard, react } = useRoom();
	const [tray, setTray] = useState(false);

	return (
		<div className="fixed inset-x-3 bottom-3 z-30 lg:static">
			{tray && (
				<div
					role="group"
					aria-label={dict.pickReaction}
					className="mx-auto mb-2 flex w-max gap-1 rounded-full bg-surface p-1.5 shadow-[0_8px_24px_rgba(13,24,82,.18)] starting:translate-y-2 starting:opacity-0 transition-all duration-150"
				>
					{EMOJIS.map((emoji) => (
						<button
							key={emoji}
							type="button"
							onClick={() => {
								react(emoji);
								setTray(false);
							}}
							className="flex size-10 items-center justify-center rounded-full text-2xl transition-transform hover:scale-125 hover:bg-primary-50"
						>
							{emoji}
						</button>
					))}
				</div>
			)}

			<div className="grid grid-cols-4 gap-2 rounded-2xl bg-surface/95 p-2 shadow-[0_8px_24px_rgba(13,24,82,.15)] backdrop-blur lg:gap-3 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
				<Control icon={micOn ? Mic : MicOff} label={dict.mic} state={micOn ? dict.on : dict.off} on={micOn} onClick={toggleMic} />
				<Control icon={camOn ? Video : VideoOff} label={dict.camera} state={camOn ? dict.on : dict.off} on={camOn} onClick={toggleCam} />
				<Control
					icon={PenLine}
					label={dict.whiteboard}
					state={whiteboardOpen ? dict.open : dict.closed}
					on={whiteboardOpen}
					onClick={toggleWhiteboard}
				/>
				<Control icon={SmilePlus} label={dict.reactions} on={tray} onClick={() => setTray((v) => !v)} expanded={tray} />
			</div>
		</div>
	);
}

function Control({
	icon: Icon,
	label,
	state,
	on,
	onClick,
	expanded,
}: {
	icon: LucideIcon;
	label: string;
	state?: string;
	on: boolean;
	onClick: () => void;
	expanded?: boolean;
}) {
	return (
		<button
			type="button"
			aria-pressed={expanded === undefined ? on : undefined}
			aria-expanded={expanded}
			onClick={onClick}
			className="flex items-center gap-2 rounded-xl border border-ink-100 bg-surface px-2.5 py-2 text-left transition-colors hover:border-primary-300 lg:gap-3 lg:px-4 lg:py-3"
		>
			<span
				className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
					on ? "bg-secondary-100 text-secondary-600" : "bg-primary-50 text-primary-500"
				}`}
			>
				<Icon aria-hidden="true" className="size-5" />
			</span>
			<span className="hidden min-w-0 flex-1 sm:block">
				<span className="block truncate text-sm font-extrabold">{label}</span>
				{state && <span className="block text-xs text-ink-500">{state}</span>}
			</span>
			<ChevronRight aria-hidden="true" className="hidden size-4 shrink-0 text-ink-300 lg:block" />
		</button>
	);
}
