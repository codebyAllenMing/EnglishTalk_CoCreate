import { ArrowRight, Users } from "lucide-react";
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
	soonNote: string;
};

/**
 * 一張房間卡片。兩種 kind 共用同一個元件 —— 差別只有配色，拆成兩個檔案會變成維護兩份相同的定位邏輯。
 *
 * 定位靠 grid-column / grid-row，不用 absolute：
 *   gridColumn = day + 2                  （第一欄是時間軸）
 *   gridRow    = 起始格 + 2 / span 佔幾格  （第一列是表頭，所以是 +2 不是 +1）
 * ⚠️ 2026-09-22 之前這裡寫 +1，所有卡片都畫早了一格（30 分鐘），設計稿本身位置不準所以沒被看出來。
 *
 * 一格 10 分鐘，卡片高度由房的長度決定，內容跟著長度縮：
 *   20 分鐘 = 24px 只有標題；40 = 48px 加時間；60 = 72px 才有語言列與人數。
 * 三行都塞進 20 分鐘會被 overflow 裁掉，不如只畫放得下的。
 *
 * 整張卡片是 Dialog 的 trigger，所以標籤是 <button> 而不是 <div> —— 可點擊的東西
 * 就該是按鈕，鍵盤才能 tab 到、Enter 才能開。Dialog 是 client，但卡片內容在這裡
 * 就渲染好了。
 *
 * hover 只加深底色、不動文字色。Tailwind 的 hover: 本來就包在 @media (hover: hover) 裡，觸控裝置不會殘留。
 */
const TONE: Record<Slot["kind"], string> = {
	session: "bg-secondary-100 text-ink hover:bg-secondary-200",
	hosted: "bg-primary-100 text-ink hover:bg-primary-200",
};

export default function SlotCard({ slot, day, locale, dict, closeLabel, soonNote }: Props) {
	const firstRow = Math.floor(slot.startMinutes / SLOT_MINUTES);
	const lastRow = Math.ceil(slot.endMinutes / SLOT_MINUTES);
	const span = Math.max(1, lastRow - firstRow);
	const minutes = slot.endMinutes - slot.startMinutes;
	const time = `${formatTime(slot.startMinutes, locale)} – ${formatTime(slot.endMinutes, locale)}`;
	const title = slot.title || dict.untitled;
	const style = { gridColumn: day + 2, gridRow: `${firstRow + 2} / span ${span}` };

	const langs = (
		<span className="flex items-center gap-1.5">
			<LangBadge code={slot.from} className="size-5 text-[9px]" />
			<ArrowRight aria-hidden="true" className="size-3 text-ink-400" />
			<LangBadge code={slot.to} className="size-5 text-[9px]" />
		</span>
	);

	return (
		<Dialog
			trigger={
				<>
					<span className="w-full truncate text-xs leading-tight font-extrabold">{title}</span>
					{minutes >= 40 && (
						<span className="w-full truncate text-[11px] leading-tight text-ink-500">{time}</span>
					)}
					{minutes >= 60 && (
						<span className="mt-auto flex w-full items-center gap-1 pt-0.5">
							<LangBadge code={slot.from} className="size-5 text-[9px]" />
							<ArrowRight aria-hidden="true" className="size-3 text-ink-400" />
							<LangBadge code={slot.to} className="size-5 text-[9px]" />
							<span className="ml-auto flex items-center gap-1 text-[11px] font-extrabold text-secondary-600">
								<Users aria-hidden="true" className="size-3.5" />
								{slot.seats.taken}/{slot.seats.total}
							</span>
						</span>
					)}
				</>
			}
			triggerClassName={`m-0.5 flex flex-col overflow-hidden rounded-xl px-2 py-0.5 text-left transition-colors ${TONE[slot.kind]}`}
			triggerStyle={style}
			title={title}
			description={time}
			closeLabel={closeLabel}
		>
			<dl className="divide-y divide-ink-100 text-sm">
				<Row label={dict.detail.type}>{dict.legend[slot.kind]}</Row>
				<Row label={dict.detail.time}>{time}</Row>
				<Row label={dict.detail.languages}>{langs}</Row>
				<Row label={dict.detail.participants}>
					{slot.seats.taken}/{slot.seats.total}
				</Row>
				<Row label={dict.detail.code}>
					<span className="font-mono tracking-wider">{slot.code}</span>
				</Row>
			</dl>
			{/* 進房 / 取消 / 退出等動作還沒接，先留「開發中」 */}
			<p className="mt-4 rounded-xl bg-primary-50 px-4 py-6 text-center text-sm text-ink-400">{soonNote}</p>
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
