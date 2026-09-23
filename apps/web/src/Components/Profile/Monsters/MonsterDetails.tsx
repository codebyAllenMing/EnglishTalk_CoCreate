import { BarChart3, CalendarDays, Check, MessageCircle } from "lucide-react";
import Avatar from "@/Components/UI/Avatar";
import LangBadge from "@/Components/UI/LangBadge";
import type { Dictionary } from "@/dictionaries";
import { describePresence } from "./MonsterCard";
import type { Monster } from "./monstersData";

type Props = {
	monster: Monster;
	locale: string;
	dict: Dictionary["profile"]["monsters"];
	levelDict: Dictionary["profile"]["level"];
	/** 「打聲招呼」：沒給就是純視覺（設定頁的預覽） */
	onGreet?: () => void;
	greet?: "idle" | "sending" | "sent";
};

/**
 * 一隻怪獸的詳情 —— 大頭像、名字 + 線上狀態、語言與程度、自我介紹、兩顆動作按鈕。
 *
 * 從 MonsterPanel 抽出來是因為**設定頁的「預覽個人頁」就是這一塊**：
 * 「其他怪獸看到你會是這個樣子」，最誠實的預覽就是把表單的值餵進同一個元件。
 * 外框（右欄 / 底部浮層 / 對話框）由呼叫端決定，這裡只管內容。
 *
 * 設計稿還有「房間最多 4 人」與「下次有空」兩塊，資料要等房間與空檔的表，先拿掉不擺假的。
 * 「查看行程」仍是純視覺（別人的行程頁還沒有）；「打聲招呼」給對方一則通知（POST /api/users/:id/greet），
 * 送過一次就鎖住，免得連點變成騷擾。
 */
export default function MonsterDetails({ monster, locale, dict, levelDict, onGreet, greet = "idle" }: Props) {
	const status = describePresence(monster, locale, dict);

	return (
		<>
			<Avatar
				src={`avatar-${monster.avatar}`}
				className="mx-auto w-36"
				sizes="144px"
			/>

			<h3 className="flex flex-wrap items-center gap-2 text-xl font-extrabold">
				{monster.name}
				<span
					className={`size-2.5 rounded-full ${
						monster.presence === "active"
							? "bg-secondary-400"
							: monster.presence === "idle"
								? "bg-token"
								: "bg-ink-200"
					}`}
				/>
				<span className="text-sm font-semibold text-ink-500">{status.text}</span>
			</h3>

			<div className="mt-3 flex flex-wrap items-center gap-2">
				<LangBadge code={monster.native} className="size-7 text-[11px]" />
				<LangBadge code={monster.learning} className="size-7 text-[11px]" />
				<span className="flex items-center gap-1.5 rounded-xl bg-primary-50 px-3 py-1.5 text-sm font-extrabold text-primary-600">
					<BarChart3 aria-hidden="true" className="size-4" />
					{levelDict[monster.level]}
				</span>
			</div>

			{monster.bio && <p className="mt-3 text-sm leading-relaxed text-ink-500">{monster.bio}</p>}

			<div className="mt-4 flex flex-col gap-2">
				<button
					type="button"
					className="flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-3 font-extrabold text-white transition-colors hover:bg-primary-600"
				>
					<CalendarDays aria-hidden="true" className="size-4" />
					{dict.panel.viewSchedule}
				</button>
				<button
					type="button"
					onClick={onGreet}
					disabled={!!onGreet && greet !== "idle"}
					className="flex items-center justify-center gap-2 rounded-xl border border-ink-100 px-4 py-3 font-extrabold text-primary-600 transition-colors hover:border-primary-300 hover:bg-primary-50 disabled:cursor-default disabled:opacity-60 disabled:hover:border-ink-100 disabled:hover:bg-transparent"
				>
					{greet === "sent" ? (
						<Check aria-hidden="true" className="size-4" strokeWidth={3} />
					) : (
						<MessageCircle aria-hidden="true" className="size-4" />
					)}
					{greet === "sent" ? dict.panel.helloDone : dict.panel.sayHello}
				</button>
			</div>
		</>
	);
}
