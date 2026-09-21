"use client";

import { ArrowLeftRight } from "lucide-react";
import { fill } from "@/Components/Profile/Monsters/monstersData";
import type { Dictionary } from "@/dictionaries";
import type { LangCode } from "../Profile/profileData";
import { formatClock } from "./roomData";
import { useRoom } from "./RoomProvider";

type Props = { dict: Dictionary["room"]["timer"] };

/**
 * 語言輪替的計時條：左中文、右英文，中間 ⇄。
 *
 * 正在倒數的那半邊實色、另一半淡下去 —— 設計稿兩邊都是實色，但那樣看不出
 * 現在輪到誰講，而「現在該講哪種語言」是這個產品唯一的規則。
 *
 * 只渲染，不判定：倒數與切換都在 RoomProvider（見那邊的說明）。
 */
export default function LanguageTimer({ dict }: Props) {
	const { timer, swapLang } = useRoom();

	return (
		<div
			role="timer"
			aria-live="off"
			className="mx-auto flex w-full max-w-3xl items-stretch rounded-full shadow-[0_8px_24px_rgba(13,24,82,.15)]"
		>
			<Half lang="zh" label={dict.zh} active={timer.active === "zh"} ended={timer.ended} />
			{/* 按了先倒數 5 秒才換（講到一半被切掉很突兀），倒數中再按是取消 */}
			<button
				type="button"
				aria-label={timer.swapIn === null ? dict.swap : dict.cancelSwap}
				title={timer.swapIn === null ? undefined : fill(dict.switchIn, { seconds: timer.swapIn })}
				onClick={swapLang}
				disabled={timer.ended}
				className={`relative z-10 -mx-4 flex size-14 shrink-0 items-center justify-center self-center rounded-full bg-surface shadow-[0_2px_8px_rgba(13,24,82,.2)] transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100 ${
					timer.swapIn === null ? "text-primary-600" : "text-danger ring-4 ring-danger-border/40"
				}`}
			>
				{timer.swapIn === null ? (
					<ArrowLeftRight aria-hidden="true" className="size-5" />
				) : (
					<span className="text-xl font-extrabold tabular-nums">{timer.swapIn}</span>
				)}
			</button>
			<Half lang="en" label={dict.en} active={timer.active === "en"} ended={timer.ended} />
		</div>
	);
}

const TONE: Record<LangCode, string> = {
	zh: "rounded-l-full bg-lang-zh pr-8 pl-5",
	en: "rounded-r-full bg-lang-en pr-5 pl-8",
};

function Half({ lang, label, active, ended }: { lang: LangCode; label: string; active: boolean; ended: boolean }) {
	const { timer } = useRoom();
	return (
		<div
			className={`flex flex-1 items-center gap-3 py-3 text-white transition-opacity ${TONE[lang]} ${
				active && !ended ? "" : "opacity-50"
			}`}
		>
			{/* 不用 LangBadge：它的底色寫死是淡色版，這裡要白字在深底上 */}
			<span
				aria-hidden="true"
				className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/25 text-[13px] font-extrabold"
			>
				{lang === "zh" ? "中" : "EN"}
			</span>
			<span className="hidden text-lg font-extrabold sm:inline">{label}</span>
			<span className="ml-auto text-2xl font-extrabold tabular-nums sm:ml-2">{formatClock(timer.remaining[lang])}</span>
		</div>
	);
}
