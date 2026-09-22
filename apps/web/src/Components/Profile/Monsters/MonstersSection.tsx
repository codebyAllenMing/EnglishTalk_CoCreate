import { getDictionary, getLocale } from "@/dictionaries";
import MonstersBoard from "./MonstersBoard";

/**
 * Find Conversation Monsters 區塊。這一層只把字典與語系餵進 client 的 Board；
 * 名單與線上狀態由 Board 自己打 API（靜態 HTML 沒有資料）。
 *
 * ⚠️ 設計稿底部那顆「Show more monsters ▾」**沒有做**：
 *    /api/users 一次最多 50 人、格狀全部攤開，那顆按鈕按下去無事可做。等分頁再補。
 */
export default async function MonstersSection() {
	const dict = await getDictionary();
	const locale = await getLocale();

	return (
		<MonstersBoard
			locale={locale}
			dict={dict.profile.monsters}
			langDict={dict.profile.lang}
			levelDict={dict.profile.level}
		/>
	);
}
