"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { Dictionary } from "@/dictionaries";
import { getOpenRooms, getSchedule, type OpenRoom, type ScheduleItem } from "@/schedule/client";
import HostRoomDialog from "./HostRoomDialog";
import ScheduleGrid from "./ScheduleGrid";
import { initialScrollTop, openSlots, slotsInWeek, toSlot, type MineSlot, type Slot } from "./scheduleData";
import {
	buildWeek,
	currentWeekStart,
	formatWeekRange,
	parseLocalDate,
	shiftWeek,
	todayIndexIn,
	weekStartOf,
	weeksBetween,
} from "./week";

type Props = {
	locale: string;
	dict: Dictionary["profile"]["schedule"];
	lang: Dictionary["profile"]["lang"];
	closeLabel: string;
	cancelLabel: string;
};

/** 一次載入的範圍：這週的前一週到後一週，共三週。切週在範圍內只是換篩選條件，超出才重打 */
const WEEKS_BEFORE = 1;
const WEEKS_AFTER = 1;

/** from 含、to 不含，都是週一的 "YYYY-MM-DD"。mine = 我有份的房；open = 別人的可申請的房（併卡在 render 時算） */
type Loaded = { from: string; to: string; mine: MineSlot[]; open: OpenRoom[] };

/** 「本週」不會在頁面開著的時候變（跨午夜那一下不值得處理），所以永遠不通知 */
const subscribeNever = () => () => {};
const serverHasNoToday = () => null;

/**
 * 週曆的資料與切週。
 *
 * ## 起始週等 mount 之後才算
 *
 * 靜態匯出是建置期 render，server 沒有「使用者的今天」；以前由 server 傳 initialWeekStart
 * 是為了避免 hydration mismatch，代價是線上的「本週」停在部署那天。現在資料反正要在瀏覽器裡
 * 才拿得到，乾脆整個板子等 mount：第一次 render 畫骨架（跟靜態 HTML 一樣），mount 後算週、拉資料。
 * 「mount 後才有值」用 useSyncExternalStore 表達：server snapshot 是 null、client snapshot 是本週，
 * React 自己處理 hydration 那一次的切換，不用 effect 裡 setState。
 *
 * ## 資料一次載入三週，切週只是篩選
 *
 * 兩支 API 一起拉：我有份的房（GET /api/me/schedule）與別人的可申請的房（GET /api/rooms）。
 * 每筆都帶絕對日期，切週用 slotsInWeek() 挑出落在該週的；週跑出載入範圍才重打，
 * 而且拉的又是以新的那週為中心的三週。連不到 API 或沒登入就畫空網格 ——
 * 導去 login 是 SessionProvider 的事，這裡不重複做。別人的房拉失敗不影響我的房。
 *
 * 黃卡（openSlots）每次 render 從 open 與 mine 重算：撞到我任何一張卡的濾掉、重疊的併成一張。
 * 所以申請了一間之後只要把它加進 mine，黃卡那邊自己會消失。
 *
 * ## 初始捲動只算一次
 *
 * 第一批資料到的時候依當週最早的房定捲動位置，之後切週不再動 —— 使用者捲到哪就在哪。
 *
 * ## 開房之後
 *
 * HostRoomDialog 住在標題列（它要拿到 onCreated，所以跟資料同一層）。新房落在載入範圍內就直接塞進 slots，
 * 不重打；然後把可見週切到那間房所在的週 —— 開了一間下下週的房卻什麼都沒看到，會以為沒建成。
 * 落在範圍外的話切週本身就會觸發重拉，新房會在那批資料裡。
 */
export default function ScheduleBoard({ locale, dict, lang, closeLabel, cancelLabel }: Props) {
	const weekStart = useSyncExternalStore(subscribeNever, currentWeekStart, serverHasNoToday);
	const [offset, setOffset] = useState(0);
	const [loaded, setLoaded] = useState<Loaded | null>(null);
	const [scrollTop, setScrollTop] = useState<number | null>(null);

	const visibleWeek = weekStart && (offset === 0 ? weekStart : shiftWeek(weekStart, offset));

	useEffect(() => {
		if (!visibleWeek) return;
		// "YYYY-MM-DD" 字串直接比大小就是日期順序
		if (loaded && visibleWeek >= loaded.from && shiftWeek(visibleWeek, 1) <= loaded.to) return;

		const from = shiftWeek(visibleWeek, -WEEKS_BEFORE);
		const to = shiftWeek(visibleWeek, WEEKS_AFTER + 1);
		let cancelled = false;
		const f = parseLocalDate(from);
		const t = parseLocalDate(to);
		Promise.all([getSchedule(f, t), getOpenRooms(f, t).catch((): OpenRoom[] => [])]).then(
			([items, open]) => {
				if (cancelled) return;
				const mine = items.map(toSlot);
				setLoaded({ from, to, mine, open });
				const week = slotsInWeek([...mine, ...openSlots(open, mine)], visibleWeek).map((x) => x.slot);
				setScrollTop((prev) => prev ?? initialScrollTop(week));
			},
			() => {
				if (!cancelled) setLoaded({ from, to, mine: [], open: [] });
			},
		);
		return () => {
			cancelled = true;
		};
	}, [visibleWeek, loaded]);

	/** 開了房或申請了別人的房：加進 mine（黃卡自己會消失）；開房的話把可見週切過去 */
	const handleAdded = (item: ScheduleItem) => {
		const slot = toSlot(item);
		setLoaded((prev) => {
			if (!prev) return prev;
			const open = prev.open.filter((r) => r.code !== slot.code);
			const inRange = slot.date >= prev.from && slot.date < prev.to;
			return { ...prev, open, mine: inRange ? [...prev.mine, slot] : prev.mine };
		});
		if (item.kind === "hosted" && weekStart) setOffset(weeksBetween(weekStart, weekStartOf(slot.date)));
	};
	/** 取消房、取消申請、或點開才發現已取消：從我的卡與別人的卡都拿掉 */
	const handleRemoved = (code: string) =>
		setLoaded((prev) =>
			prev
				? {
						...prev,
						mine: prev.mine.filter((s) => s.code !== code),
						open: prev.open.filter((r) => r.code !== code),
					}
				: prev,
		);
	const handleUpdated = (item: ScheduleItem) =>
		setLoaded((prev) =>
			prev ? { ...prev, mine: prev.mine.map((s) => (s.code === item.code ? toSlot(item) : s)) } : prev,
		);
	const actions = (
		<HostRoomDialog
			locale={locale}
			dict={dict}
			lang={lang}
			closeLabel={closeLabel}
			cancelLabel={cancelLabel}
			onCreated={handleAdded}
		/>
	);

	if (!visibleWeek) {
		return (
			<>
				<Header title={dict.title} actions={actions} />
				<div aria-hidden="true" className="h-[32rem] animate-pulse rounded-xl bg-primary-50" />
			</>
		);
	}

	const days = buildWeek(visibleWeek, locale);
	const { range, year } = formatWeekRange(visibleWeek, locale);
	const all: Slot[] = loaded ? [...loaded.mine, ...openSlots(loaded.open, loaded.mine)] : [];
	const visibleSlots = slotsInWeek(all, visibleWeek);

	return (
		<>
			<Header title={dict.title} actions={actions}>
				<p className="text-sm font-semibold text-ink-400">
					{range}
					{/* 年份排在後面、色階再淡一階 —— 它是輔助資訊，不必跟月日搶注意力，
					    也就不用決定中文該拿什麼標點來接 */}
					<span className="ml-2 text-ink-300">{year}</span>
				</p>
			</Header>

			<div className="flex items-start gap-1.5 sm:gap-2">
				<WeekButton label={dict.prevWeek} onClick={() => setOffset(offset - 1)}>
					<ChevronLeft aria-hidden="true" className="size-4" />
				</WeekButton>

				<ScheduleGrid
					days={days}
					slots={visibleSlots}
					todayIndex={todayIndexIn(visibleWeek)}
					locale={locale}
					dict={dict}
					closeLabel={closeLabel}
					cancelLabel={cancelLabel}
					onRemoved={handleRemoved}
					onAdded={handleAdded}
					onUpdated={handleUpdated}
					scrollTop={scrollTop ?? initialScrollTop([])}
				/>

				<WeekButton label={dict.nextWeek} onClick={() => setOffset(offset + 1)}>
					<ChevronRight aria-hidden="true" className="size-4" />
				</WeekButton>
			</div>
		</>
	);
}

function Header({ title, actions, children }: { title: string; actions: React.ReactNode; children?: React.ReactNode }) {
	return (
		<header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
			<h2 className="flex items-center gap-2.5 text-lg font-extrabold">
				<CalendarDays aria-hidden="true" className="size-5 text-primary-500" />
				{title}
			</h2>
			{children}
			<div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
		</header>
	);
}

function WeekButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
	return (
		<button
			type="button"
			aria-label={label}
			onClick={onClick}
			className="mt-3 shrink-0 rounded-full border border-ink-100 bg-surface p-2 text-ink-500 transition-colors hover:border-primary-300 hover:text-primary-600"
		>
			{children}
		</button>
	);
}
