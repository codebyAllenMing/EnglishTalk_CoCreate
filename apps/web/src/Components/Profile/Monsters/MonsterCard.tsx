import { Clock, Moon, Radio } from "lucide-react";
import Avatar from "@/Components/UI/Avatar";
import LangBadge from "@/Components/UI/LangBadge";
import type { Dictionary } from "@/dictionaries";
import { fill, formatLastSeen, type Monster } from "./monstersData";

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
 * 狀態列目前放線上狀態：線上中 / 閒置中 / 最後上線 N 前 / 尚未上線。
 * 設計稿這裡是「還有 2 個名額」「下午4時 有空」，那要等房間與空檔的表（使用者 2026-09-22 定的順序：
 * 名額 > 有空 > 最後上線），有了再把它們排到前面。
 */
export default function MonsterCard({ monster, selected, onSelect, locale, dict }: Props) {
	const status = describePresence(monster, locale, dict);

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
			{monster.presence && (
				<span
					title={monster.presence === "active" ? dict.onlineNow : dict.idle}
					className={`absolute top-3 right-3 size-2.5 rounded-full ${
						monster.presence === "active" ? "bg-secondary-400" : "bg-token"
					}`}
				/>
			)}

			<Avatar
				src={`avatar-${monster.avatar}`}
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
				<status.icon aria-hidden="true" className="size-3.5 shrink-0 text-primary-400" />
				<span className="truncate">{status.text}</span>
			</span>
		</button>
	);
}

/** 卡片與面板共用的狀態文字：線上中 / 閒置中 / 最後上線 N 前 / 尚未上線 */
export function describePresence(monster: Monster, locale: string, dict: Dictionary["profile"]["monsters"]) {
	if (monster.presence === "active") return { icon: Radio, text: dict.onlineNow };
	if (monster.presence === "idle") return { icon: Moon, text: dict.idle };
	return {
		icon: Clock,
		text: monster.lastSeenDate ? fill(dict.lastSeen, { time: formatLastSeen(monster.lastSeenDate, locale) }) : dict.neverSeen,
	};
}
