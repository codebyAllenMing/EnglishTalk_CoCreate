import { ArrowRight, Plus, Users } from "lucide-react";
import LangBadge from "@/Components/UI/LangBadge";
import type { Dictionary } from "@/dictionaries";
import { SLOT_MINUTES, type Slot } from "./scheduleData";
import { formatTime } from "./week";

type Props = {
	slot: Slot;
	locale: string;
	dict: Dictionary["profile"]["schedule"];
};

/**
 * 一張時段卡片。四種 kind 共用同一個元件 —— 它們的差別只有配色與顯示哪幾個欄位，
 * 拆成四個檔案會變成維護四份相同的 Grid 定位邏輯。
 *
 * 定位靠 grid-column / grid-row，不用 absolute：
 *   gridColumn = day + 2       （第一欄是時間軸）
 *   gridRow    = 起始格 + 1 / span 佔幾格
 * 跨時段的高度因此由 span 決定，不必自己算 px —— 一格固定 30 分鐘。
 */
const TONE: Record<Slot["kind"], string> = {
	open: "bg-token/25 text-ink",
	session: "bg-secondary-100 text-ink",
	hosted: "bg-primary-100 text-ink",
	add: "border-2 border-dashed border-primary-200 bg-primary-50/40 text-primary-500",
};

export default function SlotCard({ slot, locale, dict }: Props) {
	const startRow = slot.startMinutes / SLOT_MINUTES + 1;
	const span = Math.max(1, (slot.endMinutes - slot.startMinutes) / SLOT_MINUTES);
	const time = `${formatTime(slot.startMinutes, locale)} – ${formatTime(slot.endMinutes, locale)}`;

	// 高度由 span 決定，不另外設 minHeight
	const style = { gridColumn: slot.day + 2, gridRow: `${startRow} / span ${span}` };

	if (slot.kind === "add") {
		return (
			<button
				type="button"
				style={style}
				className={`m-0.5 flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-extrabold ${TONE.add}`}
			>
				{dict.addSlot}
				<Plus aria-hidden="true" className="size-4" />
			</button>
		);
	}

	return (
		<article
			style={style}
			className={`m-0.5 flex flex-col gap-0.5 overflow-hidden rounded-xl px-2 py-1.5 ${TONE[slot.kind]}`}
		>
			<h3 className="truncate text-xs leading-tight font-extrabold">{slot.title ?? dict.open}</h3>
			<p className="truncate text-[11px] leading-tight text-ink-500">{time}</p>

			{slot.from && slot.to && (
				<div className="mt-auto flex items-center gap-1 pt-0.5">
					<LangBadge code={slot.from} className="size-5 text-[9px]" />
					<ArrowRight aria-hidden="true" className="size-3 text-ink-400" />
					<LangBadge code={slot.to} className="size-5 text-[9px]" />

					{slot.seats && (
						<span
							className="ml-auto flex items-center gap-1 text-[11px] font-extrabold text-secondary-600"
							aria-label={`${slot.seats.taken} / ${slot.seats.total} ${dict.seats}`}
						>
							<Users aria-hidden="true" className="size-3.5" />
							{slot.seats.taken}/{slot.seats.total}
						</span>
					)}
				</div>
			)}
		</article>
	);
}
