import { Users } from "lucide-react";
import Card from "@/Components/UI/Card";
import { getDictionary, getLocale } from "@/dictionaries";
import ScheduleBoard from "./ScheduleBoard";
import ScheduleLegend from "./ScheduleLegend";

/**
 * My Schedule 區塊。這一層維持 Server Component，只負責外框、圖例與標題列的按鈕；
 * 資料（GET /api/me/schedule）與切週都在 ScheduleBoard（client）。
 *
 * ⚠️ 「開設聊天室」按鈕仍是純視覺，開房的 Dialog 下一輪做（API POST /api/rooms 已經在了）。
 *    「開放時段」按鈕與黃色卡 2026-09-22 拿掉了：那是 v1.0 邀請制留下的概念，房主制下沒有它的角色。
 */
export default async function ScheduleSection() {
	const dict = await getDictionary();
	const locale = await getLocale();
	const s = dict.profile.schedule;

	return (
		<Card id="schedule" className="scroll-mt-4 p-4 sm:p-5">
			<ScheduleBoard
				locale={locale}
				dict={s}
				closeLabel={dict.common.close}
				soonNote={dict.profile.soon.note}
				actions={
					<button
						type="button"
						className="flex items-center gap-2 rounded-full bg-primary-500 px-3.5 py-2 text-sm font-extrabold text-white transition-colors hover:bg-primary-600"
					>
						<Users aria-hidden="true" className="size-4" />
						{s.hostRoom}
					</button>
				}
			/>

			<ScheduleLegend dict={s} />
		</Card>
	);
}
