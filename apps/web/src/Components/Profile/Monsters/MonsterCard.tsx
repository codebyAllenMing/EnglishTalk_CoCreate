import { AlarmClock, Users } from "lucide-react";
import Avatar from "@/Components/UI/Avatar";
import LangBadge from "@/Components/UI/LangBadge";
import type { Dictionary } from "@/dictionaries";
import { fill, formatHour, type Monster } from "./monstersData";

type Props = {
	monster: Monster;
	selected: boolean;
	onSelect: () => void;
	locale: string;
	dict: Dictionary["profile"]["monsters"];
};

/**
 * 格狀裡的一張怪獸卡。整張是按鈕 —— 點了會在右側（窄版是底部）展開詳情。
 *
 * ⚠️ 線上點畫在**卡片右上角**，不是 Avatar 自己那顆。設計稿如此，而且卡片上的
 *    頭像沒有圓底（circle={false}），Avatar 的點是貼著圓緣定位的，沒有圓就會浮空。
 *
 * ⚠️ 語言徽章是**母語在前、學習中在後**。設計稿裡 Alex 是「中 EN」、Bobby 是
 *    「EN 中」—— 順序帶著資訊：第一顆才是你能跟他練到的語言。
 *
 * 狀態列兩種擇一：有開放名額就顯示名額（比較急迫、可以馬上進去），
 * 否則退回顯示下一個有空的時間。
 */
export default function MonsterCard({ monster, selected, onSelect, locale, dict }: Props) {
	const hasSlots = monster.slotsOpen !== undefined && monster.slotsOpen > 0;
	// 英文的 1 slot / 2 slots 需要兩個 key；中文兩者相同，字典各自決定
	const slotsText =
		monster.slotsOpen === 1
			? fill(dict.slotOpen, { count: 1 })
			: fill(dict.slotsOpen, { count: monster.slotsOpen ?? 0 });

	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={selected}
			className={`relative flex flex-col items-center rounded-2xl border-2 bg-surface p-3 text-center transition-colors ${
				selected
					? "border-primary-400 shadow-[0_8px_20px_rgba(105,72,220,.14)]"
					: "border-ink-100 hover:border-primary-200 hover:bg-primary-50/50"
			}`}
		>
			{monster.online && (
				<span
					title={dict.onlineNow}
					className="absolute top-3 right-3 size-2.5 rounded-full bg-secondary-400"
				/>
			)}

			<Avatar
				src={`avatar-${monster.id}`}
				className="w-20"
				sizes="80px"
				circle={false}
			/>

			<span className="mt-1 font-extrabold">{monster.name}</span>

			<span className="mt-1.5 flex items-center gap-1.5">
				<LangBadge code={monster.native} />
				<LangBadge code={monster.learning} />
			</span>

			<span className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-50 px-2 py-1.5 text-[11px] font-semibold text-ink-500">
				{hasSlots ? (
					<Users aria-hidden="true" className="size-3.5 shrink-0 text-primary-400" />
				) : (
					<AlarmClock aria-hidden="true" className="size-3.5 shrink-0 text-primary-400" />
				)}
				<span className="truncate">
					{hasSlots ? slotsText : fill(dict.freeAt, { time: formatHour(monster.freeAt, locale) })}
				</span>
			</span>
		</button>
	);
}
