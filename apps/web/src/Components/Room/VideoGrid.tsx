"use client";

import { Mic, MicOff, Play, Video, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";
import Avatar from "@/Components/UI/Avatar";
import LangBadge from "@/Components/UI/LangBadge";
import type { Dictionary } from "@/dictionaries";
import type { Participant } from "./roomData";
import { useRoom } from "./RoomProvider";

type Props = {
	youLabel: string;
	micLabel: string;
	camLabel: string;
	/** 沒連著即時通道的人格子上的標 */
	offlineLabel: string;
	dict: Dictionary["room"]["video"];
};

/**
 * 2×2 視訊格（串流來自 Cloudflare Realtime SFU，見 Video/useSfu）。
 *
 * 每格的底是**視訊流的位置**：有串流且鏡頭開著就是 <video>，否則是頭像；
 * 名字、語言徽章、mic / cam 狀態、反應泡泡都是疊在上面的 overlay，不隨底下是圖還是影片而改變。
 *
 * 自己那格：本機串流、靜音、鏡像；mic / cam 跟著 ControlBar。別人那格：mic / cam 讀 live 廣播的狀態，
 * 鏡頭關著時 <video> 仍掛著（display none）讓聲音繼續播。
 * 自己那格多一圈紫框 —— 「你」的字樣不夠一眼認出哪格是自己（使用者 2026-09-21）。
 *
 * 遠端 <video> 帶聲音，直接開網址（沒有使用者手勢）會被自動播放政策擋 → 蓋一顆「點一下開始」。
 */
export default function VideoGrid({ youLabel, micLabel, camLabel, offlineLabel, dict }: Props) {
	const { room, video, resumeVideo } = useRoom();
	const notice =
		video.status === "denied"
			? dict.denied
			: video.status === "unavailable"
				? dict.unavailable
				: video.status === "failed"
					? dict.failed
					: null;

	return (
		<div className="flex flex-col gap-3">
			{notice && (
				<p role="status" className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-bold text-danger">
					{notice}
				</p>
			)}
			<div className="relative grid grid-cols-2 gap-3">
				{room.participants.map((p) => (
					<VideoTile
						key={p.id}
						participant={p}
						youLabel={youLabel}
						micLabel={micLabel}
						camLabel={camLabel}
						offlineLabel={offlineLabel}
					/>
				))}
				{video.needsGesture && (
					<button
						type="button"
						onClick={resumeVideo}
						className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-ink/50 text-white backdrop-blur-sm"
					>
						<span className="flex size-14 items-center justify-center rounded-full bg-primary-500">
							<Play aria-hidden="true" className="size-7 translate-x-0.5" />
						</span>
						<span className="text-sm font-extrabold">{dict.tapToPlay}</span>
					</button>
				)}
			</div>
		</div>
	);
}

/**
 * <video> 綁 MediaStream。srcObject 不能走 React 屬性，只能在 effect 裡設；
 * play() 被自動播放政策拒絕就回報，使用者點了按鈕（tick 變）再試一次。
 */
function VideoView({
	stream,
	muted,
	mirror,
	visible,
	tick,
	onBlocked,
}: {
	stream: MediaStream;
	muted: boolean;
	mirror: boolean;
	visible: boolean;
	tick: number;
	onBlocked: () => void;
}) {
	const ref = useRef<HTMLVideoElement>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (el.srcObject !== stream) el.srcObject = stream;
		el.play().catch(() => onBlocked());
	}, [stream, tick, onBlocked]);
	return (
		<video
			ref={ref}
			muted={muted}
			playsInline
			autoPlay
			className={visible ? `absolute inset-0 size-full object-cover ${mirror ? "-scale-x-100" : ""}` : "hidden"}
		/>
	);
}

const BACKDROP: Record<string, string> = {
	zh: "from-lang-zh/25 via-primary-50 to-token/20",
	en: "from-lang-en/25 via-primary-50 to-secondary-100",
};

function VideoTile({
	participant: p,
	youLabel,
	micLabel,
	camLabel,
	offlineLabel,
}: { participant: Participant } & Omit<Props, "dict">) {
	const { micOn, camOn, reactions, online, video, videoBlocked } = useRoom();
	const state = video.media[p.id];
	const stream = p.me ? video.localStream : video.remote[p.id];
	// 別人的開關讀廣播來的狀態；還沒送過（沒推、沒權限）就當關著
	const mic = p.me ? micOn : (state?.mic ?? false);
	const cam = p.me ? camOn : (state?.cam ?? false);
	const showVideo = !!stream && cam;
	const reaction = reactions[p.id];
	// 在線 = 連著即時通道；自己那格不看（自己還在 connecting 時不該標自己離線）
	const isOffline = !p.me && !online.includes(p.id);

	return (
		<div
			className={`relative aspect-video overflow-hidden rounded-2xl bg-linear-to-br ${BACKDROP[p.lang]} ${
				cam ? "" : "grayscale-[.4]"
			} ${p.me ? "ring-2 ring-primary-400 ring-offset-2 ring-offset-app" : ""} ${isOffline ? "opacity-60" : ""}`}
		>
			{isOffline && (
				<span className="absolute top-3 right-3 rounded-full bg-ink/60 px-2.5 py-1 text-[11px] font-extrabold text-white">
					{offlineLabel}
				</span>
			)}
			{/* 鏡頭關著時就是頭像；<video> 在有串流時一直掛著，關鏡頭只是藏起來讓聲音繼續 */}
			{!showVideo && (
				<Avatar
					src={`avatar-${p.avatar}`}
					className="absolute inset-x-0 bottom-0 mx-auto w-[46%]"
					sizes="(min-width: 1280px) 220px, 40vw"
					circle={false}
				/>
			)}
			{stream && (
				<VideoView
					stream={stream}
					muted={!!p.me}
					mirror={!!p.me}
					visible={showVideo}
					tick={video.gestureTick}
					onBlocked={videoBlocked}
				/>
			)}

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
