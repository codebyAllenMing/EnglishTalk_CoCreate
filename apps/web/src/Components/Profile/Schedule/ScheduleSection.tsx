import { CalendarDays, ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import Card from "@/Components/UI/Card";
import Dialog from "@/Components/UI/Dialog";
import { getDictionary, getLocale } from "@/dictionaries";
import ScheduleGrid from "./ScheduleGrid";
import ScheduleLegend from "./ScheduleLegend";
import { getFakeSchedule, initialScrollTop } from "./scheduleData";
import { buildWeek } from "./week";

/**
 * My Schedule 區塊。
 *
 * ⚠️ 週切換的 ‹ › 與兩顆動作按鈕目前都是純視覺 —— 切過去沒有資料可切，
 *    建立時段也要等後端。照專案既有決策，沒有去處的東西不做成可互動的假象。
 *    ‹ › 放在捲動容器**外面**，所以橫向捲動時它們不會跟著跑掉。
 *
 * ⚠️ 週的起訖與 todayIndex 都由 getFakeSchedule() 算好後以 props 傳進去，
 *    元件本身不碰 new Date()。靜態匯出是建置期 render，線上的「本週」會停在部署
 *    那一天 —— 那是靜態站的限制，但至少每次部署都會更新，dev 則永遠是對的。
 */
export default async function ScheduleSection() {
	const dict = await getDictionary();
	const locale = await getLocale();
	const s = dict.profile.schedule;

	const schedule = getFakeSchedule();
	const days = buildWeek(schedule.weekStart, locale);
	const scrollTop = initialScrollTop(schedule.slots);

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
					{/*
					 * 第一個接上 Dialog 的地方。trigger 的內容在這裡（Server Component）
					 * 渲染好再傳進去，所以這個區塊不必跟著變成 client。
					 *
					 * confirm 只給 label 與 disabled、沒有 onClick —— 函式無法從 Server
					 * Component 跨到 client。接 API 時這一區會連同表單一起轉成 client，
					 * 屆時才補上 onClick。內容目前也還是 placeholder。
					 */}
					<Dialog
						trigger={
							<>
								<Plus aria-hidden="true" className="size-4" />
								{s.openSlot}
							</>
						}
						triggerClassName="flex items-center gap-2 rounded-full bg-primary-500 px-3.5 py-2 text-sm font-extrabold text-white transition-colors hover:bg-primary-600"
						title={s.openSlot}
						description={s.openSlotHint}
						closeLabel={dict.common.close}
						cancel={{ label: dict.common.cancel }}
						confirm={{ label: s.createSlot, disabled: true }}
					>
						<p className="rounded-xl bg-primary-50 px-4 py-8 text-center text-sm text-ink-400">
							{dict.profile.soon.note}
						</p>
					</Dialog>
				</div>
			</header>

			<div className="flex items-start gap-1.5 sm:gap-2">
				<WeekButton label={s.prevWeek}>
					<ChevronLeft aria-hidden="true" className="size-4" />
				</WeekButton>

				<ScheduleGrid
					days={days}
					slots={schedule.slots}
					todayIndex={schedule.todayIndex}
					locale={locale}
					dict={s}
					closeLabel={dict.common.close}
					cancelLabel={dict.common.cancel}
					soonNote={dict.profile.soon.note}
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
