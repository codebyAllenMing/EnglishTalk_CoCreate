"use client";

import type { Dictionary } from "@/dictionaries";
import type { ScheduleItem } from "@/schedule/client";
import OpenSlotCard from "./OpenSlotCard";
import SlotCard from "./SlotCard";
import type { Slot } from "./scheduleData";
import type { WeekDay } from "./week";

type Props = {
	days: WeekDay[];
	slots: readonly { slot: Slot; day: number }[];
	todayIndex: number;
	locale: string;
	dict: Dictionary["profile"]["schedule"];
	closeLabel: string;
	cancelLabel: string;
	onRemoved: (code: string) => void;
	onAdded: (item: ScheduleItem) => void;
	onUpdated: (item: ScheduleItem) => void;
	now: number | null;
};

/**
 * 週曆的列表版：同一週的資料依日期分組、一列一間房，空的日子不畫。
 * 每一列就是 SlotCard / OpenSlotCard 的「列」外觀，點開的對話框跟日曆完全同一套。
 */
export default function ScheduleList({ days, slots, todayIndex, locale, dict, closeLabel, cancelLabel, onRemoved, onAdded, onUpdated, now }: Props) {
	const groups = days
		.map((day) => ({
			day,
			items: slots.filter((s) => s.day === day.index).sort((a, b) => a.slot.startMinutes - b.slot.startMinutes),
		}))
		.filter((g) => g.items.length > 0);

	if (groups.length === 0) {
		return <p className="min-h-48 py-10 text-center text-sm text-ink-400">{dict.list.empty}</p>;
	}

	return (
		<div className="flex min-w-0 flex-1 flex-col gap-5">
			{groups.map(({ day, items }) => (
				<section key={day.index}>
					<h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-ink-500">
						<span>
							{day.weekday} {day.dayMonth}
						</span>
						{day.index === todayIndex && (
							<span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] text-primary-600">{dict.list.today}</span>
						)}
					</h3>
					<ul className="flex flex-col gap-2">
						{items.map(({ slot, day: d }) => (
							<li key={slot.kind === "open" ? slot.key : slot.code}>
								{slot.kind === "open" ? (
									<OpenSlotCard
										variant="row"
										slot={slot}
										day={d}
										locale={locale}
										dict={dict}
										closeLabel={closeLabel}
										cancelLabel={cancelLabel}
										onJoined={onAdded}
										onGone={onRemoved}
									/>
								) : (
									<SlotCard
										variant="row"
										now={now}
										slot={slot}
										day={d}
										locale={locale}
										dict={dict}
										closeLabel={closeLabel}
										onRemoved={onRemoved}
										onUpdated={onUpdated}
									/>
								)}
							</li>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}
