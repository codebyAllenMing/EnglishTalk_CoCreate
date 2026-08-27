import { ArrowRight, BarChart3, CalendarDays, Ghost, MessageCircle, Users, X } from "lucide-react";
import { formatTime, toMinutes } from "@/Components/Profile/Schedule/week";
import Avatar from "@/Components/UI/Avatar";
import Card from "@/Components/UI/Card";
import LangBadge from "@/Components/UI/LangBadge";
import type { Dictionary } from "@/dictionaries";
import { fill, type Monster } from "./monstersData";

type Props = {
	/** null = 還沒選人。桌機顯示提示、窄版整個不出現 */
	monster: Monster | null;
	onClose: () => void;
	locale: string;
	dict: Dictionary["profile"]["monsters"];
	levelDict: Dictionary["profile"]["level"];
};

/**
 * 選中怪獸的詳情。**同一個 DOM 節點兩種版型**：
 *
 * - `xl` 以上：格狀右側的常駐欄位（設計稿的樣子）。沒選人時顯示提示而不是消失 ——
 *   欄位一下有一下沒有，旁邊格狀的寬度就會跟著跳。
 * - `xl` 以下：貼在畫面底部的浮動面板 + 半透明遮罩。
 *
 * ⚠️ 兩種版型**沒有走 Dialog**。原生 `<dialog>` 的 `showModal()` 是 JS 呼叫，
 *    媒體查詢擋不住它 —— 要嘛在 effect 裡自己 matchMedia（把斷點複製一份到 JS，
 *    兩邊遲早漂移），要嘛把面板內容渲染兩次。這裡用 CSS 換 position 就好：
 *    一份內容、一個節點、斷點只存在於 CSS。
 *    代價是少了 `<dialog>` 的焦點鎖與 inert，Esc 關閉由 MonstersBoard 補上。
 *
 * 面板上的三顆按鈕（下次有空、查看行程、打聲招呼）目前都是純視覺 ——
 * 對應的頁面與 API 都還不存在，跟側邊欄七項、週曆的「開設聊天室」同一個處理。
 */
export default function MonsterPanel({ monster, onClose, locale, dict, levelDict }: Props) {
	return (
		<>
			{/* 遮罩只在窄版存在。桌機的面板是版面的一部分，不該把後面壓暗。
			    z 要壓過 TabBar 的 z-30，不然暗幕之上會浮著一條亮的導覽列 */}
			{monster && (
				<button
					type="button"
					aria-label={dict.panel.close}
					onClick={onClose}
					className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] xl:hidden"
				/>
			)}

			{/*
			 * ⚠️ 定位的 relative 放在**內層** div，不放在 Card 上。
			 *    Tailwind 的 position utility 同屬一組、輸出順序固定
			 *    （static → fixed → absolute → relative → sticky），
			 *    同時掛 relative 與 fixed 的話**永遠是 relative 贏**，跟 class 寫的
			 *    先後無關 —— 窄版的浮層會直接失效。
			 *    xl 用 static 也是為了同一件事：static 會忽略 inset-x / bottom，
			 *    不必再補一排 xl:inset-auto 去清掉窄版的定位。
			 */}
			<Card
				className={`overflow-y-auto xl:static xl:max-h-none xl:w-66 xl:shrink-0 xl:overflow-visible ${
					monster ? "fixed inset-x-3 bottom-3 z-50 max-h-[85dvh]" : "hidden xl:block"
				}`}
			>
				<div className="relative p-5">
					{monster ? (
						<>
							<button
								type="button"
								aria-label={dict.panel.close}
								onClick={onClose}
								className="absolute top-0 right-0 rounded-full border border-ink-100 p-2 text-ink-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
							>
								<X aria-hidden="true" className="size-4" />
							</button>

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
					) : (
						<div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
							<Ghost aria-hidden="true" className="size-10 text-primary-200" />
							<p className="font-extrabold text-ink-400">{dict.hint.title}</p>
							<p className="text-sm text-ink-300">{dict.hint.note}</p>
						</div>
					)}
				</div>
			</Card>
		</>
	);
}
