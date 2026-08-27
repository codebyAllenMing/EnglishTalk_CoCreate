import { CalendarDays, ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import Card from "@/Components/UI/Card";
import { getDictionary, getLocale } from "@/dictionaries";
import ScheduleGrid from "./ScheduleGrid";
import ScheduleLegend from "./ScheduleLegend";
import { FAKE_SCHEDULE, initialScrollTop } from "./scheduleData";
import { buildWeek } from "./week";

/**
 * My Schedule 區塊。
 *
 * ⚠️ 週切換的 ‹ › 與兩顆動作按鈕目前都是純視覺 —— 切過去沒有資料可切，
 *    建立時段也要等後端。照專案既有決策，沒有去處的東西不做成可互動的假象。
 *    ‹ › 放在捲動容器**外面**，所以橫向捲動時它們不會跟著跑掉。
 *
 * ⚠️ todayIndex 由資料傳入而不是在這裡算 new Date()：靜態匯出是建置期 render，
 *    元件內算出來的「今天」會凍結在部署那一天。接上 API 後改傳入來源即可。
 */
export default async function ScheduleSection() {
	const dict = await getDictionary();
	const locale = await getLocale();
	const s = dict.profile.schedule;

	const days = buildWeek(FAKE_SCHEDULE.weekStart, locale);
	const scrollTop = initialScrollTop(FAKE_SCHEDULE.slots);

	return (
		<Card className="p-4 sm:p-5">
			<header className="mb-4 flex flex-wrap items-center gap-3">
				<h2 className="flex items-center gap-2.5 text-lg font-extrabold">
					<CalendarDays aria-hidden="true" className="size-5 text-primary-500" />
					{s.title}
				</h2>

				<div className="ml-auto flex flex-wrap items-center gap-2">
					<button
						type="button"
						className="flex items-center gap-2 rounded-full border-2 border-ink-200 px-3.5 py-2 text-sm font-extrabold transition-colors hover:border-primary-400 hover:text-primary-600"
					>
						<Users aria-hidden="true" className="size-4" />
						{s.hostRoom}
					</button>
					<button
						type="button"
						className="flex items-center gap-2 rounded-full bg-primary-500 px-3.5 py-2 text-sm font-extrabold text-white transition-colors hover:bg-primary-600"
					>
						<Plus aria-hidden="true" className="size-4" />
						{s.openSlot}
					</button>
				</div>
			</header>

			<div className="flex items-start gap-1.5 sm:gap-2">
				<WeekButton label={s.prevWeek}>
					<ChevronLeft aria-hidden="true" className="size-4" />
				</WeekButton>

				<ScheduleGrid
					days={days}
					slots={FAKE_SCHEDULE.slots}
					todayIndex={FAKE_SCHEDULE.todayIndex}
					locale={locale}
					dict={s}
					scrollTop={scrollTop}
				/>

				<WeekButton label={s.nextWeek}>
					<ChevronRight aria-hidden="true" className="size-4" />
				</WeekButton>
			</div>

			<ScheduleLegend dict={s} />
		</Card>
	);
}

function WeekButton({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<button
			type="button"
			aria-label={label}
			className="mt-3 shrink-0 rounded-full border border-ink-100 bg-surface p-2 text-ink-500 transition-colors hover:border-primary-300 hover:text-primary-600"
		>
			{children}
		</button>
	);
}
