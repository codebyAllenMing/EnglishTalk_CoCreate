import type { Metadata } from "next";
import BrandBlock from "@/Components/Profile/BrandBlock";
import InviteCard from "@/Components/Profile/InviteCard";
import ProfileCard from "@/Components/Profile/ProfileCard";
import SideNav from "@/Components/Profile/SideNav";
import TabBar from "@/Components/Profile/TabBar";
import TopBar from "@/Components/Profile/TopBar";
import Card from "@/Components/UI/Card";
import { getDictionary } from "@/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
	const dict = await getDictionary();
	return { title: `${dict.profile.nav.home} — MonsterTalk` };
}

/**
 * 個人首頁 —— 登入後的主畫面。
 *
 * ⚠️ 這一頁沒有任何存取保護。登入是假的（見 AuthForm 的 FAKE_AUTH），
 *    直接輸入網址就能進來。資料全部來自 FAKE_PROFILE。
 *
 * 路由取名 /home 而非 /dashboard：landing 是給「還沒登入的人」看的，
 * 這裡才是登入後的家。命名照使用者的心智模型，不照技術慣例。
 *
 * ## 版面
 *
 * 桌機是側邊欄 + 主區的兩欄；lg 以下側邊欄拆開來 —— 品牌列與頂部列併成一排、
 * 個人資料卡移到內容上方、導覽換成固定在底部的 TabBar、邀請卡沉到最後。
 *
 * 品牌列、個人資料卡、邀請卡在兩種版型各出現一次（互斥的 hidden / lg:hidden）。
 * 重複的是 DOM 節點不是請求：display:none 的 <Image> 預設 lazy 不會下載，
 * 所以 ProfileCard 的頭像**刻意不給 priority** —— 給了會變成同一張圖 preload 兩次。
 */
export default async function HomePage() {
	const dict = await getDictionary();
	const { soon } = dict.profile;

	return (
		<div className="min-h-dvh bg-app">
			{/* pb-20 讓內容不被固定在底部的 TabBar 蓋住；桌機沒有 TabBar 所以收回去 */}
			<div className="mx-auto flex max-w-[1440px] gap-6 px-4 pt-4 pb-20 lg:px-6 lg:pt-5 lg:pb-6">
				<aside className="hidden w-66 shrink-0 flex-col gap-4 lg:flex">
					<BrandBlock />
					<ProfileCard />
					<SideNav />
					<InviteCard />
				</aside>

				<div className="flex min-w-0 flex-1 flex-col gap-5">
					<header className="flex items-center justify-between gap-4 lg:justify-end">
						<div className="lg:hidden">
							<BrandBlock compact />
						</div>
						<TopBar />
					</header>

					<div className="lg:hidden">
						<ProfileCard />
					</div>

					<main className="flex flex-col gap-5">
						<Placeholder title={soon.schedule} note={soon.note} className="min-h-64" />
						<Placeholder title={soon.monsters} note={soon.note} className="min-h-96" />
					</main>

					<div className="lg:hidden">
						<InviteCard />
					</div>
				</div>
			</div>

			<TabBar />
		</div>
	);
}

/**
 * 尚未實作的區塊。留出接近實際高度的空框，是為了現在就看得出整頁的比例，
 * 而不是等兩區都做完才發現版面不對。
 */
function Placeholder({
	title,
	note,
	className,
}: {
	title: string;
	note: string;
	className: string;
}) {
	return (
		<Card className={`flex flex-col items-center justify-center gap-2 p-6 ${className}`}>
			<h2 className="text-lg font-extrabold text-ink-400">{title}</h2>
			<p className="text-sm text-ink-300">{note}</p>
		</Card>
	);
}
