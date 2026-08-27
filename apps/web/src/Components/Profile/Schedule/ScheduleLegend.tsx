import type { Dictionary } from "@/dictionaries";
import type { SlotKind } from "./scheduleData";

type Props = { dict: Dictionary["profile"]["schedule"] };

/** 圖例的色塊要跟 SlotCard 的 TONE 對得上，改配色時兩邊一起改 */
const SWATCH: Record<SlotKind, string> = {
	open: "bg-token/25",
	session: "bg-secondary-100",
	hosted: "bg-primary-100",
	add: "border-2 border-dashed border-primary-200",
};

export default function ScheduleLegend({ dict }: Props) {
	const items: SlotKind[] = ["open", "session", "hosted", "add"];

	return (
		<div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-ink-500">
			{items.map((kind) => (
				<span key={kind} className="flex items-center gap-2">
					<span className={`size-3 shrink-0 rounded-full ${SWATCH[kind]}`} />
					{dict.legend[kind]}
				</span>
			))}
			<span className="ml-auto text-ink-300">{dict.timezone}</span>
		</div>
	);
}
