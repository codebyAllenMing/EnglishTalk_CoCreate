import { ArrowRight, Plus, Users } from "lucide-react";
import Dialog from "@/Components/UI/Dialog";
import LangBadge from "@/Components/UI/LangBadge";
import type { Dictionary } from "@/dictionaries";
import { SLOT_MINUTES, type Slot } from "./scheduleData";
import { formatTime } from "./week";

type Props = {
	slot: Slot;
	/** 該時段落在這一週的第幾欄。由 slotsInWeek() 算好傳進來 */
	day: number;
	locale: string;
	dict: Dictionary["profile"]["schedule"];
	closeLabel: string;
	cancelLabel: string;
	soonNote: string;
};

/**
 * 一張時段卡片。四種 kind 共用同一個元件 —— 它們的差別只有配色與顯示哪幾個欄位，
 * 拆成四個檔案會變成維護四份相同的 Grid 定位邏輯。
 *
 * 定位靠 grid-column / grid-row，不用 absolute：
 *   gridColumn = day + 2       （第一欄是時間軸）
 *   gridRow    = 起始格 + 1 / span 佔幾格
 * 跨時段的高度因此由 span 決定，不必自己算 px —— 一格固定 30 分鐘。
 *
 * 整張卡片是 Dialog 的 trigger，所以標籤是 <button> 而不是 <div> —— 可點擊的東西
 * 就該是按鈕，鍵盤才能 tab 到、Enter 才能開。Dialog 是 client，但卡片內容在這裡
 * （Server Component）就渲染好了，不會把週曆整區拖進 client bundle。
 *
 * hover 只加深底色、不動文字色。三種卡片的底色深淺差很多，真反色的話 open 那張
 * （token #F4D15E）配白字對比度只有 1.9:1 不能用，行為會不一致。
 * Tailwind 的 hover: 本來就包在 @media (hover: hover) 裡，觸控裝置不會殘留。
 */
const TONE: Record<Slot["kind"], string> = {
	open: "bg-token/25 text-ink hover:bg-token/55",
	session: "bg-secondary-100 text-ink hover:bg-secondary-200",
	hosted: "bg-primary-100 text-ink hover:bg-primary-200",
	add: "border-2 border-dashed border-primary-200 bg-primary-50/40 text-primary-500 hover:border-solid hover:border-primary-400 hover:bg-primary-100",
};

export default function SlotCard({
	slot,
	day,
	locale,
	dict,
	closeLabel,
	cancelLabel,
	soonNote,
}: Props) {
	const startRow = slot.startMinutes / SLOT_MINUTES + 1;
	const span = Math.max(1, (slot.endMinutes - slot.startMinutes) / SLOT_MINUTES);
	const time = `${formatTime(slot.startMinutes, locale)} – ${formatTime(slot.endMinutes, locale)}`;
	const style = { gridColumn: day + 2, gridRow: `${startRow} / span ${span}` };

	const placeholder = (
		<p className="rounded-xl bg-primary-50 px-4 py-6 text-center text-sm text-ink-400">
			{soonNote}
		</p>
	);

	if (slot.kind === "add") {
		return (
			<Dialog
				trigger={
					<>
						{dict.addSlot}
						<Plus aria-hidden="true" className="size-4" />
					</>
				}
				triggerClassName={`m-0.5 flex flex-col items-center justify-center gap-1 rounded-xl text-xs font-extrabold transition-colors ${TONE.add}`}
				triggerStyle={style}
				title={dict.openSlot}
				description={dict.openSlotHint}
				closeLabel={closeLabel}
				cancel={{ label: cancelLabel }}
				confirm={{ label: dict.createSlot, disabled: true }}
			>
				{placeholder}
			</Dialog>
		);
	}

	return (
		<Dialog
			trigger={
				<>
					<span className="w-full truncate text-xs leading-tight font-extrabold">
						{slot.title ?? dict.open}
					</span>
					<span className="w-full truncate text-[11px] leading-tight text-ink-500">
						{time}
					</span>

					{slot.from && slot.to && (
						<span className="mt-auto flex w-full items-center gap-1 pt-0.5">
							<LangBadge code={slot.from} className="size-5 text-[9px]" />
							<ArrowRight aria-hidden="true" className="size-3 text-ink-400" />
							<LangBadge code={slot.to} className="size-5 text-[9px]" />

							{slot.seats && (
								<span className="ml-auto flex items-center gap-1 text-[11px] font-extrabold text-secondary-600">
									<Users aria-hidden="true" className="size-3.5" />
									{slot.seats.taken}/{slot.seats.total}
								</span>
							)}
						</span>
					)}
				</>
			}
			triggerClassName={`m-0.5 flex flex-col gap-0.5 overflow-hidden rounded-xl px-2 py-1.5 text-left transition-colors ${TONE[slot.kind]}`}
			triggerStyle={style}
			title={slot.title ?? dict.open}
			description={time}
			closeLabel={closeLabel}
		>
			<dl className="divide-y divide-ink-100 text-sm">
				<Row label={dict.detail.type}>{dict.legend[slot.kind]}</Row>
				<Row label={dict.detail.time}>{time}</Row>
				{slot.from && slot.to && (
					<Row label={dict.detail.languages}>
						<span className="flex items-center gap-1.5">
							<LangBadge code={slot.from} className="size-5 text-[9px]" />
							<ArrowRight aria-hidden="true" className="size-3 text-ink-400" />
							<LangBadge code={slot.to} className="size-5 text-[9px]" />
						</span>
					</Row>
				)}
				{slot.seats && (
					<Row label={dict.detail.participants}>
						{slot.seats.taken}/{slot.seats.total}
					</Row>
				)}
			</dl>
			<div className="mt-4">{placeholder}</div>
		</Dialog>
	);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-4 py-2.5">
			<dt className="text-ink-500">{label}</dt>
			<dd className="font-semibold">{children}</dd>
		</div>
	);
}
