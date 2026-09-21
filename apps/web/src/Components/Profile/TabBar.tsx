import Link from "next/link";
import { getDictionary, getLocale } from "@/dictionaries";
import { NAV_ITEMS, type NavKey } from "./navItems";

/**
 * 手機版的底部導覽，取代桌機的側邊欄。
 *
 * 選了 tab bar 而不是漢堡抽屜（使用者 2026-08-27 決定）：抽屜要 client state，
 * tab bar 純 CSS 就能切，整頁維持 Server Component。代價是七項只放得下五項，
 * History 與 Word Bank 只在桌機出現 —— 那兩項不在主要動線上。
 *
 * 固定在底部，所以主要內容區要留出等高的下邊距（見 AppShell 的 pb-20）。
 */
export default async function TabBar({ current }: { current: NavKey }) {
	const dict = await getDictionary();
	const locale = await getLocale();
	const { nav } = dict.profile;
	const items = NAV_ITEMS.filter((item) => item.inTabBar);

	return (
		<nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-surface/95 backdrop-blur lg:hidden">
			<ul className="flex items-stretch">
				{items.map(({ key, icon: Icon, href }) => {
					const isCurrent = key === current;
					const className = `flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${
						isCurrent ? "text-primary-600" : "text-ink-400"
					}`;
					const content = (
						<>
							<Icon aria-hidden="true" className="size-5" />
							{nav[key]}
						</>
					);

					return (
						<li key={key} className="flex-1">
							{href ? (
								<Link
									href={`/${locale}${href}`}
									aria-current={isCurrent ? "page" : undefined}
									className={className}
								>
									{content}
								</Link>
							) : (
								<span className={className}>{content}</span>
							)}
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
