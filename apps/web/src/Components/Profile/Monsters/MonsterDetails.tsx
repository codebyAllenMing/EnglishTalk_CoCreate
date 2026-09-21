import { ArrowRight, BarChart3, CalendarDays, MessageCircle, Users } from "lucide-react";
import { formatTime, toMinutes } from "@/Components/Profile/Schedule/week";
import Avatar from "@/Components/UI/Avatar";
import LangBadge from "@/Components/UI/LangBadge";
import type { Dictionary } from "@/dictionaries";
import { fill, type Monster } from "./monstersData";

type Props = {
	monster: Monster;
	locale: string;
	dict: Dictionary["profile"]["monsters"];
	levelDict: Dictionary["profile"]["level"];
};

/**
 * 一隻怪獸的詳情 —— 大頭像、名字 + 線上狀態、語言與程度、自我介紹、房間人數、
 * 下次有空、兩顆動作按鈕。
 *
 * 從 MonsterPanel 抽出來是因為**設定頁的「預覽個人頁」就是這一塊**：
 * 「其他怪獸看到你會是這個樣子」，最誠實的預覽就是把表單的值餵進同一個元件。
 * 外框（右欄 / 底部浮層 / 對話框）由呼叫端決定，這裡只管內容。
 *
 * 三顆按鈕（下次有空、查看行程、打聲招呼）目前都是純視覺 ——
 * 對應的頁面與 API 都還不存在，跟側邊欄、週曆的「開設聊天室」同一個處理。
 */
export default function MonsterDetails({ monster, locale, dict, levelDict }: Props) {
	return (
		<>
			<Avatar
				src={`avatar-${monster.id}`}
				className="mx-auto w-36"
				sizes="144px"
			/>

			<h3 className="flex flex-wrap items-center gap-2 text-xl font-extrabold">
				{monster.name}
				<span
					className={`size-2.5 rounded-full ${
						monster.online ? "bg-secondary-400" : "bg-ink-200"
					}`}
				/>
				<span className="text-sm font-semibold text-ink-500">
					{monster.online ? dict.onlineNow : dict.offline}
				</span>
			</h3>

			<div className="mt-3 flex flex-wrap items-center gap-2">
				<LangBadge code={monster.native} className="size-7 text-[11px]" />
				<LangBadge code={monster.learning} className="size-7 text-[11px]" />
				<span className="flex items-center gap-1.5 rounded-xl bg-primary-50 px-3 py-1.5 text-sm font-extrabold text-primary-600">
					<BarChart3 aria-hidden="true" className="size-4" />
					{levelDict[monster.level]}
				</span>
			</div>

			<p className="mt-3 text-sm leading-relaxed text-ink-500">{monster.bio}</p>

			<p className="mt-4 flex items-center gap-2 rounded-xl bg-token/20 px-3 py-2.5 text-sm font-semibold">
				<Users aria-hidden="true" className="size-4 shrink-0 text-ink-400" />
				{fill(dict.panel.roomUpTo, { count: monster.roomSize })}
			</p>

			<p className="mt-4 text-sm text-ink-400">{dict.panel.nextAvailable}</p>
			<button
				type="button"
				className="mt-1.5 flex w-full items-center justify-between gap-2 rounded-xl border border-ink-100 px-3.5 py-3 text-left font-extrabold text-primary-600 transition-colors hover:border-primary-300 hover:bg-primary-50"
			>
				{dict.panel.today} {formatTime(toMinutes(monster.freeAt), locale)}
				<ArrowRight aria-hidden="true" className="size-4 shrink-0" />
			</button>

			<div className="mt-3 flex flex-col gap-2">
				<button
					type="button"
					className="flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 font-extrabold text-white transition-colors hover:bg-primary-600"
				>
					<CalendarDays aria-hidden="true" className="size-4" />
					{dict.panel.viewSchedule}
				</button>
				<button
					type="button"
					className="flex items-center justify-center gap-2 rounded-xl border border-ink-100 px-4 py-3 font-extrabold text-primary-600 transition-colors hover:border-primary-300 hover:bg-primary-50"
				>
					<MessageCircle aria-hidden="true" className="size-4" />
					{dict.panel.sayHello}
				</button>
			</div>
		</>
	);
}
