import { Plus, Users } from "lucide-react";
import Card from "@/Components/UI/Card";
import Dialog from "@/Components/UI/Dialog";
import { getDictionary, getLocale } from "@/dictionaries";
import ScheduleBoard from "./ScheduleBoard";
import ScheduleLegend from "./ScheduleLegend";
import { getFakeSchedule, initialScrollTop, slotsInWeek } from "./scheduleData";


/**
 * My Schedule 區塊。
 *
 * ⚠️ 標題列那兩顆（Host a room / 開放時段）仍是純視覺，建立流程要等後端。
 *
 * 週切換已經可用，但它需要 client（靜態匯出沒有伺服器、URL query 不會觸發新的
 * SSG），所以拆到 ScheduleBoard。這一層維持 Server Component，只負責外框、
 * 標題列與圖例 —— 讓進 client bundle 的範圍停在網格本身。
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
	// 初始捲動位置看當週就好 —— 前後週的時段不影響第一眼要停在哪
	const scrollTop = initialScrollTop(
		slotsInWeek(schedule.slots, schedule.weekStart).map((x) => x.slot),
	);

	return (
		<Card className="p-4 sm:p-5">
			<ScheduleBoard
				initialWeekStart={schedule.weekStart}
				slots={schedule.slots}
				locale={locale}
				dict={s}
				closeLabel={dict.common.close}
				cancelLabel={dict.common.cancel}
				soonNote={dict.profile.soon.note}
				scrollTop={scrollTop}
				actions={
					<>
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
					</>
				}
			/>

			<ScheduleLegend dict={s} />
		</Card>
	);
}
