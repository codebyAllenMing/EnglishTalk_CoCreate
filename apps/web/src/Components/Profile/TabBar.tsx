import CountBadge from "@/Components/UI/CountBadge";
import { getDictionary } from "@/dictionaries";
import { NAV_ITEMS } from "./navItems";
import { FAKE_PROFILE } from "./profileData";

/**
 * 手機版的底部導覽，取代桌機的側邊欄。
 *
 * 選了 tab bar 而不是漢堡抽屜（使用者 2026-08-27 決定）：抽屜要 client state，
 * tab bar 純 CSS 就能切，整頁維持 Server Component。代價是七項只放得下五項，
 * Rooms 與 Reputation 只在桌機出現 —— 那兩項不在主要動線上。
 *
 * 固定在底部，所以主要內容區要留出等高的下邊距（見 page.tsx 的 pb-20）。
 */
export default async function TabBar() {
	const dict = await getDictionary();
	const { nav } = dict.profile;
	const items = NAV_ITEMS.filter((item) => item.inTabBar);

	return (
		<nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-surface/95 backdrop-blur lg:hidden">
			<ul className="flex items-stretch">
				{items.map(({ key, icon: Icon }, i) => {
					const current = i === 0;
					return (
						<li key={key} className="flex-1">
							<span
								aria-current={current ? "page" : undefined}
								className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${
									current ? "text-primary-600" : "text-ink-400"
								}`}
							>
								<span className="relative">
									<Icon aria-hidden="true" className="size-5" />
									{key === "messages" && (
										<span className="absolute -top-1.5 -right-2.5">
											<CountBadge
												count={FAKE_PROFILE.unreadMessages}
												label={nav.messages}
											/>
										</span>
									)}
								</span>
								{nav[key]}
							</span>
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
