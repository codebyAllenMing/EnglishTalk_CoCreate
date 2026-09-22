"use client";

import { ArrowRight, DoorOpen, Radio } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Card from "@/Components/UI/Card";
import LangBadge from "@/Components/UI/LangBadge";
import type { Dictionary } from "@/dictionaries";
import { getSchedule, type ScheduleItem } from "@/schedule/client";
import { fill } from "./Monsters/monstersData";
import { entryState, formatCountdown } from "./Schedule/entry";
import { formatTime, toISODate } from "./Schedule/week";

type Props = {
	locale: string;
	dict: Dictionary["profile"]["schedule"];
	className?: string;
};

/** 往前 2 小時（進行中的房）到往後 7 天 */
const LOOKBACK_MS = 2 * 60 * 60_000;
const LOOKAHEAD_MS = 7 * 24 * 60 * 60_000;
/** 一小時內才畫倒數，更遠的只顯示時間 */
const COUNTDOWN_WITHIN_MS = 60 * 60_000;

/**
 * 「接下來的房間」快捷入口（使用者 2026-09-23：手機拉日曆麻煩，要一個畫面上就能點進去的）。
 * 放在 home 最上面：手機在個人資料卡之前、桌機在主欄最上面，兩處各掛一次（互斥的 lg:hidden / hidden lg:block），
 * 資料共用同一個 promise 不重打。
 *
 * 只看我有份且已加入的房（房主或 approved），挑還沒結束的裡面最近的一場：
 *   進行中           → 綠底 + 「進入房間」
 *   一小時內要開始   → 倒數，到開始前 5 分鐘按鈕亮起
 *   更晚             → 時間 + 「查看」捲到週曆
 * 沒有預約整張不畫。同一天還有別場就多一行「另有 N 場」。
 */
export default function NextRoomCard({ locale, dict, className = "" }: Props) {
	const [items, setItems] = useState<ScheduleItem[] | null>(null);
	const [now, setNow] = useState<number | null>(null);

	useEffect(() => {
		let stale = false;
		loadUpcoming().then(
			(list) => {
				if (!stale) setItems(list);
			},
			() => {
				if (!stale) setItems([]);
			},
		);
		return () => {
			stale = true;
		};
	}, []);

	// 每秒對一次牆鐘：倒數、到點按鈕亮起、結束了換下一場
	useEffect(() => {
		const tick = () => setNow(Date.now());
		const id = setInterval(tick, 1000);
		document.addEventListener("visibilitychange", tick);
		return () => {
			clearInterval(id);
			document.removeEventListener("visibilitychange", tick);
		};
	}, []);

	if (!items || now === null) return null;
	const upcoming = items
		.filter((r) => r.status === "approved" && new Date(r.endDate).getTime() > now)
		.sort((a, b) => a.startDate.localeCompare(b.startDate));
	const room = upcoming[0];
	if (!room) return null;

	const start = new Date(room.startDate);
	const end = new Date(room.endDate);
	const entry = entryState(start.getTime(), end.getTime(), now);
	const sameDay = upcoming.filter((r) => r !== room && toISODate(new Date(r.startDate)) === toISODate(start)).length;
	const time = `${formatTime(start.getHours() * 60 + start.getMinutes(), locale)} – ${formatTime(end.getHours() * 60 + end.getMinutes(), locale)}`;
	const day = new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" }).format(start);
	const live = entry.phase === "open";
	const soon = entry.phase === "before" && entry.opensIn <= COUNTDOWN_WITHIN_MS;

	return (
		<Card
			className={`p-4 sm:p-5 ${live ? "bg-secondary-50 ring-2 ring-secondary-300" : ""} ${className}`}
		>
			<div className="flex items-center gap-2 text-sm font-extrabold text-ink-500">
				{live ? (
					<>
						<Radio aria-hidden="true" className="size-4 text-secondary-600" />
						<span className="text-secondary-700">{dict.next.live}</span>
					</>
				) : (
					<>
						<DoorOpen aria-hidden="true" className="size-4 text-primary-500" />
						{dict.next.title}
					</>
				)}
			</div>

			<div className="mt-2 min-w-0">
				<p className="truncate text-base font-extrabold">{room.title || dict.untitled}</p>
				<p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-500">
					<span>
						{day} {time}
					</span>
					<span className="flex items-center gap-1">
						<LangBadge code={room.from} className="size-5 text-[9px]" />
						<ArrowRight aria-hidden="true" className="size-3 text-ink-400" />
						<LangBadge code={room.to} className="size-5 text-[9px]" />
					</span>
					<span className="font-mono tracking-wider text-ink-400">{room.code}</span>
				</p>
			</div>

			{/* 動作自己一列：手機寬度不夠跟標題擠，桌機靠右 */}
			<div className="mt-3 flex sm:justify-end">
				{live ? (
					<Link
						href={`/${locale}/room/${room.code}`}
						className="w-full rounded-full bg-secondary-500 px-5 py-2.5 text-center text-sm font-extrabold text-white transition-colors hover:bg-secondary-600 sm:w-auto"
					>
						{dict.enter.button}
					</Link>
				) : soon ? (
					<button
						type="button"
						disabled
						className="w-full rounded-full bg-ink-100 px-5 py-2.5 text-sm font-extrabold text-ink-400 tabular-nums sm:w-auto"
					>
						{fill(dict.enter.opensIn, { time: formatCountdown(entry.opensIn) })}
					</button>
				) : (
					<a
						href="#schedule"
						className="w-full rounded-full bg-primary-50 px-5 py-2.5 text-center text-sm font-extrabold text-primary-600 transition-colors hover:bg-primary-100 sm:w-auto"
					>
						{dict.next.view}
					</a>
				)}
			</div>

			{sameDay > 0 && (
				<a href="#schedule" className="mt-2 inline-block text-xs font-semibold text-ink-400 hover:text-primary-600">
					{fill(dict.next.more, { count: sameDay })}
				</a>
			)}
		</Card>
	);
}

/** 兩個實例（手機 / 桌機各一）共用同一次請求 */
let inflight: { at: number; promise: Promise<ScheduleItem[]> } | null = null;
function loadUpcoming(): Promise<ScheduleItem[]> {
	const at = Date.now();
	if (inflight && at - inflight.at < 5_000) return inflight.promise;
	const promise = getSchedule(new Date(at - LOOKBACK_MS), new Date(at + LOOKAHEAD_MS));
	inflight = { at, promise };
	return promise;
}
