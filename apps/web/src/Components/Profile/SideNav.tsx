import CountBadge from "@/Components/UI/CountBadge";
import { getDictionary } from "@/dictionaries";
import { NAV_ITEMS } from "./navItems";
import { FAKE_PROFILE } from "./profileData";

/**
 * 桌機側邊欄的七項導覽。手機版改用 TabBar，兩者共用 navItems.ts 的同一份定義。
 *
 * ⚠️ 全部是純視覺不給連結 —— 對應頁面都還不存在。第一項是當前頁，用 aria-current
 *    標記；其餘既不是連結也不是按鈕，所以用 <li> 而不是 <a>，免得鍵盤使用者
 *    tab 到一個按了沒反應的東西。
 */
export default async function SideNav() {
	const dict = await getDictionary();
	const { nav } = dict.profile;

	return (
		<nav>
			<ul className="space-y-0.5">
				{NAV_ITEMS.map(({ key, icon: Icon }, i) => {
					const current = i === 0;
					return (
						<li
							key={key}
							aria-current={current ? "page" : undefined}
							className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${
								current
									? "bg-primary-50 text-primary-600"
									: "cursor-default text-ink-600"
							}`}
						>
							<Icon aria-hidden="true" className="size-5 shrink-0" />
							<span className="flex-1">{nav[key]}</span>
							{key === "messages" && (
								<CountBadge count={FAKE_PROFILE.unreadMessages} label={nav.messages} />
							)}
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
