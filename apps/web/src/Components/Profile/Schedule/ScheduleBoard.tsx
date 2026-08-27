"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Dictionary } from "@/dictionaries";
import ScheduleGrid from "./ScheduleGrid";
import { slotsInWeek, type Slot } from "./scheduleData";
import { buildWeek, formatWeekRange, shiftWeek, todayIndexIn } from "./week";

type Props = {
	/** 由 Server Component 算好的當週，client 只在這個基準上位移 */
	initialWeekStart: string;
	slots: readonly Slot[];
	locale: string;
	dict: Dictionary["profile"]["schedule"];
	closeLabel: string;
	cancelLabel: string;
	soonNote: string;
	scrollTop: number;
	/**
	 * 標題列右側的動作按鈕。由 Server Component 渲染好傳進來 ——
	 * header 的結構得在 client（日期範圍要跟著切週變），但按鈕內容不必跟著搬，
	 * 裡面那個 Dialog 的 trigger 也就還是 server 渲染的。
	 */
	actions: React.ReactNode;
};

/**
 * 週切換 + 網格。這是週曆唯一需要 client 的部分。
 *
 * ## 為什麼一定得是 client
 *
 * 靜態匯出沒有伺服器，URL query 不會觸發新的 SSG，所以「換一週」只能在瀏覽器端
 * 重新計算。範圍已經縮到最小：外框、標題列、圖例都留在 ScheduleSection（server），
 * 只有 ‹ › 與網格進 client bundle。
 *
 * ## 起始週由 server 傳入
 *
 * 不在這裡呼叫 currentWeekStart()。client 算出來的是「使用者的今天」，
 * server 算出來的是「建置那天」，兩邊不一致會造成 hydration mismatch。
 * 讓 server 決定基準、client 只管 offset，兩邊的第一次渲染就會相同。
 *
 * ## 資料一次載入，切週只是篩選
 *
 * slots 是整個範圍（目前前後各一週）的時段，每筆都帶絕對日期。切週時用
 * slotsInWeek() 挑出落在該週的，換算成欄位索引 —— **不重新打 API**。
 * 超出載入範圍的那幾週會是空網格，那是正確的呈現。
 */
export default function ScheduleBoard({
	initialWeekStart,
	slots,
	locale,
	dict,
	closeLabel,
	cancelLabel,
	soonNote,
	scrollTop,
	actions,
}: Props) {
	const [offset, setOffset] = useState(0);

	const weekStart = offset === 0 ? initialWeekStart : shiftWeek(initialWeekStart, offset);
	const days = buildWeek(weekStart, locale);
	const { range, year } = formatWeekRange(weekStart, locale);
	// 切週只是換一組篩選條件，不重新取資料 —— slots 已經是整個範圍
	const visibleSlots = slotsInWeek(slots, weekStart);

	return (
		<>
			<header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
				<h2 className="flex items-center gap-2.5 text-lg font-extrabold">
					<CalendarDays aria-hidden="true" className="size-5 text-primary-500" />
					{dict.title}
				</h2>
				<p className="text-sm font-semibold text-ink-400">
					{range}
					{/* 年份排在後面、色階再淡一階 —— 它是輔助資訊，不必跟月日搶注意力，
					    也就不用決定中文該拿什麼標點來接 */}
					<span className="ml-2 text-ink-300">{year}</span>
				</p>
				<div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>
			</header>

			<div className="flex items-start gap-1.5 sm:gap-2">
				<WeekButton label={dict.prevWeek} onClick={() => setOffset(offset - 1)}>
					<ChevronLeft aria-hidden="true" className="size-4" />
				</WeekButton>

				<ScheduleGrid
					days={days}
					slots={visibleSlots}
					todayIndex={todayIndexIn(weekStart)}
					locale={locale}
					dict={dict}
					closeLabel={closeLabel}
					cancelLabel={cancelLabel}
					soonNote={soonNote}
					scrollTop={scrollTop}
				/>

					<WeekButton label={dict.nextWeek} onClick={() => setOffset(offset + 1)}>
						<ChevronRight aria-hidden="true" className="size-4" />
					</WeekButton>
			</div>
		</>
	);
}

function WeekButton({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick: () => void;
	children: React.ReactNode;
}) {
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
