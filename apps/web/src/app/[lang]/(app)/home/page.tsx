import type { Metadata } from "next";
import AppShell from "@/Components/Profile/AppShell";
import InviteCard from "@/Components/Profile/InviteCard";
import MonstersSection from "@/Components/Profile/Monsters/MonstersSection";
import NextRoomCard from "@/Components/Profile/NextRoomCard";
import ProfileCard from "@/Components/Profile/ProfileCard";
import RoomEndedNotice from "@/Components/Profile/RoomEndedNotice";
import ScheduleSection from "@/Components/Profile/Schedule/ScheduleSection";
import { getDictionary, getLocale } from "@/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
	const dict = await getDictionary();
	return { title: `${dict.profile.nav.home} — MonsterTalk` };
}

/**
 * 個人首頁 —— 登入後的主畫面。
 *
 * ⚠️ 存取保護只有 (app)/layout.tsx 的 SessionProvider 在 client 查 session、沒登入導去 login ——
 *    靜態匯出沒有 middleware，HTML 本身仍是公開的。個人資料來自 ProfileProvider（client 載入），
 *    週曆 / 怪獸 / 代幣 / 評價仍是 FAKE_*。
 *
 * 路由取名 /home 而非 /dashboard：landing 是給「還沒登入的人」看的，
 * 這裡才是登入後的家。命名照使用者的心智模型，不照技術慣例。
 *
 * 殼（側邊欄、頂部列、TabBar）在 AppShell。個人資料卡與邀請卡是這一頁特有的：
 * 桌機在側邊欄，窄版分別落到主內容的上方與下方 —— 所以各傳兩次。
 */
export default async function HomePage() {
	const dict = await getDictionary();
	const locale = await getLocale();
	const card = <ProfileCard locale={locale} card={dict.profile.card} lang={dict.profile.lang} level={dict.profile.level} />;
	// 「接下來的房間」：手機放在個人資料卡之前（一進來不用捲就看到），桌機放主欄最上面；兩處互斥
	const next = (className: string) => <NextRoomCard locale={locale} dict={dict.profile.schedule} className={className} />;
	return (
		<AppShell
			current="home"
			beforeNav={card}
			afterNav={<InviteCard />}
			mobileTop={
				<div className="flex flex-col gap-5">
					{next("")}
					{card}
				</div>
			}
			mobileBottom={<InviteCard />}
		>
			{next("hidden lg:block")}
			<ScheduleSection />
			<MonstersSection />
			{/* 從結束的房間被送回來時才會彈（看 ?ended=） */}
			<RoomEndedNotice dict={dict.room} closeLabel={dict.common.close} confirmLabel={dict.common.confirm} />
		</AppShell>
	);
}
