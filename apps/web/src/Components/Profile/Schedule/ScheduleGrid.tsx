import type { Dictionary } from "@/dictionaries";
import SlotCard from "./SlotCard";
import { SLOTS_PER_DAY, SLOT_HEIGHT, type Slot } from "./scheduleData";
import type { WeekDay } from "./week";

type Props = {
	days: WeekDay[];
	slots: readonly { slot: Slot; day: number }[];
	todayIndex: number;
	locale: string;
	dict: Dictionary["profile"]["schedule"];
	closeLabel: string;
	cancelLabel: string;
	soonNote: string;
	scrollTop: number;
};

const TIME_COL = "4rem";
const SCROLL_ID = "schedule-scroll";
/** 每 2 小時一條水平線與一個時間標籤 = 4 格 */
const LABEL_EVERY = 4;

/**
 * 週曆網格。一天 48 格（30 分鐘一格）全部展開，外框限高、內部捲動。
 *
 * ## 三個 sticky 缺一不可
 *
 * 兩軸都能捲，所以表頭要 `top-0`、時間軸要 `left-0`，而兩者交叉的左上角**兩個都要**
 * —— 少了它，橫向捲動時時間軸會從表頭底下穿過去。z-index 也得分三層：
 * 左上角 > 表頭 > 時間軸 > 內容。
 *
 * ⚠️⚠️ **grid 必須是 `w-max min-w-full`，只給 `grid` 會讓 sticky 中途失效。**
 *    sticky 元素的移動範圍受它的 containing block 限制，這裡就是這個 grid。
 *    不設寬度時 grid 的寬度等於外層容器（例如手機的 300px），904px 的欄位是溢出去的
 *    —— 往右捲超過 300px 之後，時間軸就被 containing block 的右邊界推著一起跑。
 *    `w-max` 讓 grid 的寬度等於內容寬度，sticky 才能在整段捲動距離裡黏住；
 *    `min-w-full` 則保住寬螢幕的行為 —— 容器比內容寬時仍撐滿，`1fr` 照常均分。
 *    兩個一起用才同時滿足窄螢幕捲動與寬螢幕撐滿。
 *
 * ## 欄寬同一份 CSS 應付兩種版型
 *
 * `minmax(120px, 1fr)`：桌機被 1fr 撐滿，手機七欄合計 896px 超出畫面而自然橫向捲動，
 * 不需要為手機另寫斷點。使用者要的「手勢拖拉往右」就是這個。
 *
 * ## 初始捲動位置
 *
 * 全天展開有 1632px，不捲的話打開只看到一片空的凌晨。用一小段 inline script 設
 * scrollTop —— 它跟著 HTML 一起送達、在 hydration 前就執行，畫面不會閃，
 * 而且整區維持 Server Component，不必為了一行 scrollTop 把週曆推進 client bundle。
 * 時機問題交給 ResizeObserver，見下方註解。
 */
export default function ScheduleGrid({
	days,
	slots,
	todayIndex,
	locale,
	dict,
	closeLabel,
	cancelLabel,
	soonNote,
	scrollTop,
}: Props) {
	const hourFmt = new Intl.DateTimeFormat(locale, { hour: "numeric" });
	const labels = Array.from({ length: SLOTS_PER_DAY / LABEL_EVERY }, (_, i) =>
		hourFmt.format(new Date(2000, 0, 1, i * 2)),
	);

	return (
		<>
			<div id={SCROLL_ID} className="max-h-[32rem] min-w-0 flex-1 overflow-auto">
				<div
					className="grid w-max min-w-full"
					style={{
						gridTemplateColumns: `${TIME_COL} repeat(7, minmax(120px, 1fr))`,
						gridTemplateRows: `auto repeat(${SLOTS_PER_DAY}, ${SLOT_HEIGHT}px)`,
					}}
				>
					{/* 左上角：兩軸都釘住，否則橫向捲動時時間軸會從表頭底下穿出去 */}
					<div className="sticky top-0 left-0 z-30 bg-surface" style={{ gridArea: "1 / 1" }} />

					{days.map((day) => (
						<div
							key={day.index}
							style={{ gridColumn: day.index + 2, gridRow: 1 }}
							className={`sticky top-0 z-20 rounded-t-xl px-2 py-2.5 text-center ${
								day.index === todayIndex ? "bg-primary-50" : "bg-surface"
							}`}
						>
							<p
								className={`text-sm font-extrabold ${
									day.index === todayIndex ? "text-primary-600" : ""
								}`}
							>
								{day.weekday}
							</p>
							<p className="text-xs text-ink-400">{day.dayMonth}</p>
						</div>
					))}

					{labels.map((label, i) => (
						<div
							key={label + i}
							style={{ gridColumn: 1, gridRow: `${i * LABEL_EVERY + 2} / span ${LABEL_EVERY}` }}
							className="sticky left-0 z-10 bg-surface pr-2 text-right text-xs font-bold text-ink-400"
						>
							{/*
							 * 標籤的中線要對齊該小時的格線，所以往上提半行 ——
							 * 但第一個（12 AM）提上去就跑進 sticky 表頭底下被切掉，
							 * 它的線正好是格子頂端，不提反而剛好。
							 */}
							<span className={i === 0 ? "" : "relative -top-1.5"}>{label}</span>
						</div>
					))}

					{/* 背景層：欄的分隔線與每 2 小時的水平虛線。卡片在 DOM 之後，自然疊在上面 */}
					{days.map((day) => (
						<div
							key={`col-${day.index}`}
							style={{ gridColumn: day.index + 2, gridRow: `2 / -1` }}
							className={`border-l border-ink-100 ${
								day.index === todayIndex ? "bg-primary-50/40" : ""
							}`}
						/>
					))}
					{labels.map((_, i) => (
						<div
							key={`line-${i}`}
							style={{ gridColumn: "2 / -1", gridRow: i * LABEL_EVERY + 2 }}
							className="border-t border-dashed border-ink-100"
						/>
					))}

					{slots.map(({ slot, day }, i) => (
						<SlotCard
							key={i}
							slot={slot}
							day={day}
							locale={locale}
							dict={dict}
							closeLabel={closeLabel}
							cancelLabel={cancelLabel}
							soonNote={soonNote}
						/>
					))}
				</div>
			</div>

			{/*
			 * ⚠️ 不能只設一次就走。這段 script 在 HTML 解析到這裡就執行，但 Next.js 的
			 *    dev 模式是用 JS 注入 CSS 的 —— 那一刻 max-h 還沒套用，容器的
			 *    scrollHeight 等於 clientHeight，scrollTop 會被瀏覽器 clamp 成 0。
			 *    production 的 CSS 是 head 裡的 blocking <link>，第一次就會成功。
			 *
			 *    所以先試一次，不成就用 ResizeObserver 等容器真的變得可捲動再設，
			 *    設完立刻斷開。這比賭 rAF 的單一時機可靠 —— 不論 CSS 何時到位都接得住。
			 */}
			<script
				dangerouslySetInnerHTML={{
					__html:
						`(function(){` +
						`var e=document.getElementById(${JSON.stringify(SCROLL_ID)});if(!e)return;` +
						`var f=function(){if(e.scrollHeight<=e.clientHeight)return false;e.scrollTop=${scrollTop};return true};` +
						`if(f())return;` +
						`if(typeof ResizeObserver!=="function")return;` +
						`var o=new ResizeObserver(function(){if(f())o.disconnect()});o.observe(e)` +
						`})()`,
				}}
			/>
		</>
	);
}
