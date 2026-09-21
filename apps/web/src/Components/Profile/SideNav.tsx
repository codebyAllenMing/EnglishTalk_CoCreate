import Link from "next/link";
import { getDictionary, getLocale } from "@/dictionaries";
import { NAV_ITEMS, type NavKey } from "./navItems";

/**
 * 桌機側邊欄的七項導覽。手機版改用 TabBar，兩者共用 navItems.ts 的同一份定義。
 *
 * 有 href 的是 <Link>，其餘既不是連結也不是按鈕，所以用純 <li> 而不是 <a> ——
 * 對應頁面還不存在，做成連結會讓鍵盤使用者 tab 到一個按了沒反應的東西。
 *
 * 目前頁面由呼叫端（AppShell）告訴我們，不在這裡讀路由：
 * 這樣整個側邊欄維持 Server Component，也不用為了一個高亮引入 usePathname。
 */
export default async function SideNav({ current }: { current: NavKey }) {
	const dict = await getDictionary();
	const locale = await getLocale();
	const { nav } = dict.profile;

	return (
		<nav>
			<ul className="space-y-0.5">
				{NAV_ITEMS.map(({ key, icon: Icon, href }) => {
					const isCurrent = key === current;
					const className = `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
						isCurrent
							? "bg-primary-50 text-primary-600"
							: href
								? "text-ink-600 hover:bg-primary-50/60 hover:text-primary-600"
								: "cursor-default text-ink-600"
					}`;
					const content = (
						<>
							<Icon aria-hidden="true" className="size-5 shrink-0" />
							<span className="flex-1">{nav[key]}</span>
						</>
					);

					return (
						<li key={key}>
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
