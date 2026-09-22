import { X } from "lucide-react";
import Card from "@/Components/UI/Card";
import { Monster as MonsterIcon } from "@/Components/UI/MonsterIcon";
import type { Dictionary } from "@/dictionaries";
import MonsterDetails from "./MonsterDetails";
import type { Monster } from "./monstersData";

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
 * 內容本身在 MonsterDetails —— 設定頁的「預覽個人頁」也是同一塊，
 * 這裡只負責外框、遮罩與 ✕。
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

							<MonsterDetails monster={monster} locale={locale} dict={dict} levelDict={levelDict} />
						</>
					) : (
						<div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
							<MonsterIcon aria-hidden="true" className="size-10 text-primary-200" />
							<p className="font-extrabold text-ink-400">{dict.hint.title}</p>
							<p className="text-sm text-ink-300">{dict.hint.note}</p>
						</div>
					)}
				</div>
			</Card>
		</>
	);
}
