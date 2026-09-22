"use client";

import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import Avatar from "@/Components/UI/Avatar";
import LangBadge from "@/Components/UI/LangBadge";
import type { Participant } from "./roomData";
import { useRoom } from "./RoomProvider";

type Props = { youLabel: string; micLabel: string; camLabel: string };

/**
 * 2×2 視訊格。
 *
 * 每格的底是**視訊流的位置**：接 LiveKit 時那個 16:9 的框直接換成 <video>，
 * 名字、語言徽章、mic / cam 狀態、反應泡泡都是疊在上面的 overlay，不隨底下
 * 是圖還是影片而改變。鏡頭關閉時顯示頭像 —— 所以 mock 的畫面就是 camera off 的畫面，
 * 不是丟掉的東西。
 *
 * 自己那格的 mic / cam 跟著 ControlBar 的狀態走，別人的固定開著（假資料）。
 * 自己那格多一圈紫框 —— 「你」的字樣不夠一眼認出哪格是自己（使用者 2026-09-21）。
 */
export default function VideoGrid({ youLabel, micLabel, camLabel }: Props) {
	const { room } = useRoom();
	return (
		<div className="grid grid-cols-2 gap-3">
			{room.participants.map((p) => (
				<VideoTile key={p.id} participant={p} youLabel={youLabel} micLabel={micLabel} camLabel={camLabel} />
			))}
		</div>
	);
}

const BACKDROP: Record<string, string> = {
	zh: "from-lang-zh/25 via-primary-50 to-token/20",
	en: "from-lang-en/25 via-primary-50 to-secondary-100",
};

function VideoTile({ participant: p, youLabel, micLabel, camLabel }: { participant: Participant } & Props) {
	const { micOn, camOn, reactions } = useRoom();
	const mic = p.me ? micOn : true;
	const cam = p.me ? camOn : true;
	const reaction = reactions[p.id];

	return (
		<div
			className={`relative aspect-video overflow-hidden rounded-2xl bg-linear-to-br ${BACKDROP[p.lang]} ${
				cam ? "" : "grayscale-[.4]"
			} ${p.me ? "ring-2 ring-primary-400 ring-offset-2 ring-offset-app" : ""}`}
		>
			{/* 視訊流的替身。鏡頭關著時就是這個畫面 */}
			<Avatar
				src={`avatar-${p.avatar}`}
				className="absolute inset-x-0 bottom-0 mx-auto w-[46%]"
				sizes="(min-width: 1280px) 220px, 40vw"
				circle={false}
			/>

			{reaction && (
				/*
				 * 對話泡泡。圓身 + 尾巴畫在同一個 SVG 裡（一個圓、一個三角形，同色相接），
				 * 陰影用 drop-shadow 套在整個 SVG 上才會沿著合併後的外形走 ——
				 * 用兩個 div 拼的話，尾巴的方塊有一半露在圓外面、陰影也會各自為政。
				 */
				<span
					aria-hidden="true"
					className="absolute top-3 right-3 w-12 starting:scale-50 starting:opacity-0 transition-all duration-200"
				>
					<svg
						viewBox="0 0 48 52"
						className="h-auto w-full text-surface drop-shadow-[0_2px_6px_rgba(13,24,82,.18)]"
						fill="currentColor"
					>
						<circle cx="24" cy="24" r="24" />
						<path d="M7 41 L2 51 L16 46.5 Z" />
					</svg>
					<span className="absolute inset-x-0 top-0 flex size-12 items-center justify-center text-2xl">
						{reaction}
					</span>
				</span>
			)}

			<div className="absolute inset-x-2 bottom-2 flex items-center gap-2">
				<span className="flex items-center gap-1.5 rounded-full bg-ink/60 py-1 pr-1.5 pl-3 text-sm font-extrabold text-white backdrop-blur-sm">
					{p.me ? youLabel : p.name}
					<LangBadge code={p.lang} className="size-6 text-[10px]" />
				</span>
				<span className="ml-auto flex items-center gap-1.5">
					<Status on={mic} label={micLabel} onIcon={Mic} offIcon={MicOff} />
					<Status on={cam} label={camLabel} onIcon={Video} offIcon={VideoOff} />
				</span>
			</div>
		</div>
	);
}

function Status({
	on,
	label,
	onIcon: On,
	offIcon: Off,
}: {
	on: boolean;
	label: string;
	onIcon: typeof Mic;
	offIcon: typeof Mic;
}) {
	const Icon = on ? On : Off;
	return (
		<span
			title={label}
			className={`flex size-8 items-center justify-center rounded-full backdrop-blur-sm ${
				on ? "bg-ink/60 text-secondary-300" : "bg-danger/80 text-white"
			}`}
		>
			<Icon aria-hidden="true" className="size-4" />
		</span>
	);
}
