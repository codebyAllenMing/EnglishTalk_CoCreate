import type { ReactNode } from "react";
import BrandBlock from "./BrandBlock";
import type { NavKey } from "./navItems";
import SideNav from "./SideNav";
import TabBar from "./TabBar";
import TopBar from "./TopBar";

type Props = {
	/** 導覽要高亮哪一項 */
	current: NavKey;
	children: ReactNode;
	/** 頁面標題區。桌機跟頂部列同一排（設計稿的位置），窄版落到主內容上方 */
	heading?: ReactNode;
	/** 桌機側邊欄，品牌列與導覽之間（個人首頁放個人資料卡） */
	beforeNav?: ReactNode;
	/** 桌機側邊欄，導覽之後（個人首頁放邀請卡） */
	afterNav?: ReactNode;
	/** 窄版主內容上方 / 下方。桌機側邊欄的卡片在窄版要落到哪，由頁面決定 */
	mobileTop?: ReactNode;
	mobileBottom?: ReactNode;
};

/**
 * 登入後所有頁面共用的殼：側邊欄 + 頂部列 + 手機版 TabBar。
 *
 * ## 為什麼是元件不是 layout.tsx
 *
 * 側邊欄的內容**每頁不同** —— 個人首頁有個人資料卡與邀請卡，設定頁只有導覽
 * （設計稿如此，你正在編輯的東西不該同時顯示在旁邊）。Next 的 layout 拿不到
 * 子頁的 props，要塞這種每頁不同的區塊得走 parallel routes，為了兩個 slot 太重。
 * 讓每頁自己 render `<AppShell>`，slot 用 props 傳，代價只是導覽時殼會重新掛載 ——
 * 這是靜態站，本來也沒有需要保留的殼狀態。
 *
 * ## 版面
 *
 * 桌機是側邊欄 + 主區的兩欄；lg 以下側邊欄拆開來 —— 品牌列與頂部列併成一排、
 * 側邊欄的卡片由頁面決定落到主內容上方或下方、導覽換成固定在底部的 TabBar。
 *
 * 同一張卡片在兩種版型各出現一次（互斥的 hidden / lg:hidden）。重複的是 DOM 節點
 * 不是請求：display:none 的 <Image> 預設 lazy 不會下載。
 */
export default function AppShell({
	current,
	children,
	heading,
	beforeNav,
	afterNav,
	mobileTop,
	mobileBottom,
}: Props) {
	return (
		<div className="min-h-dvh bg-app">
			{/* pb-20 讓內容不被固定在底部的 TabBar 蓋住；桌機沒有 TabBar 所以收回去 */}
			<div className="mx-auto flex max-w-[1440px] gap-6 px-4 pt-4 pb-20 lg:px-6 lg:pt-5 lg:pb-6">
				<aside className="hidden w-66 shrink-0 flex-col gap-4 lg:flex">
					<BrandBlock />
					{beforeNav}
					<SideNav current={current} />
					{afterNav}
				</aside>

				<div className="flex min-w-0 flex-1 flex-col gap-5">
					<header className="flex items-center gap-4">
						<div className="lg:hidden">
							<BrandBlock compact />
						</div>
						{heading && <div className="hidden min-w-0 lg:block">{heading}</div>}
						<div className="ml-auto">
							<TopBar />
						</div>
					</header>

					{heading && <div className="lg:hidden">{heading}</div>}
					{mobileTop && <div className="lg:hidden">{mobileTop}</div>}

					<main className="flex flex-col gap-5">{children}</main>

					{mobileBottom && <div className="lg:hidden">{mobileBottom}</div>}
				</div>
			</div>

			<TabBar current={current} />
		</div>
	);
}
