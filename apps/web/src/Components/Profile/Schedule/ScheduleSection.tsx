import Card from "@/Components/UI/Card";
import { getDictionary, getLocale } from "@/dictionaries";
import ScheduleBoard from "./ScheduleBoard";
import ScheduleLegend from "./ScheduleLegend";

/**
 * My Schedule 區塊。這一層維持 Server Component，只負責外框與圖例；
 * 資料（GET /api/me/schedule）、切週與開房的 Dialog 都在 ScheduleBoard（client）。
 *
 * 「開放時段」按鈕與黃色卡 2026-09-22 拿掉了：那是 v1.0 邀請制留下的概念，房主制下沒有它的角色。
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
				lang={dict.profile.lang}
				closeLabel={dict.common.close}
				cancelLabel={dict.common.cancel}
			/>

			<ScheduleLegend dict={s} />
		</Card>
	);
}
