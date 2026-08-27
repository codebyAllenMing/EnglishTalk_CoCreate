import { getDictionary, getLocale } from "@/dictionaries";
import MonstersBoard from "./MonstersBoard";
import { FAKE_MONSTERS } from "./monstersData";

/**
 * Find Conversation Monsters 區塊。
 *
 * 這一層只做一件事：把字典、語系與（未來的）資料餵進 client 的 Board。
 * 接上後端時改動也只在這裡 —— 換成 await 取資料，下面完全不用動。
 *
 * ⚠️ 設計稿底部那顆「Show more monsters ▾」**沒有做**：
 *    假資料就只有 10 隻、格狀已經全部攤開，那顆按鈕按下去無事可做。
 *    等 API 有分頁再補。
 */
export default async function MonstersSection() {
	const dict = await getDictionary();
	const locale = await getLocale();

	return (
		<MonstersBoard
			monsters={FAKE_MONSTERS}
			locale={locale}
			dict={dict.profile.monsters}
			langDict={dict.profile.lang}
			levelDict={dict.profile.level}
		/>
	);
}
