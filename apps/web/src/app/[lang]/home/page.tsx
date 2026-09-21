import type { Metadata } from "next";
import AppShell from "@/Components/Profile/AppShell";
import InviteCard from "@/Components/Profile/InviteCard";
import MonstersSection from "@/Components/Profile/Monsters/MonstersSection";
import ProfileCard from "@/Components/Profile/ProfileCard";
import RoomEndedNotice from "@/Components/Profile/RoomEndedNotice";
import ScheduleSection from "@/Components/Profile/Schedule/ScheduleSection";
import { getDictionary } from "@/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
	const dict = await getDictionary();
	return { title: `${dict.profile.nav.home} — MonsterTalk` };
}

/**
 * 個人首頁 —— 登入後的主畫面。
 *
 * ⚠️ 這一頁沒有任何存取保護。登入已接真 API（見 src/auth/client.ts），但靜態匯出沒有 middleware，
 *    直接輸入網址仍能進來；client 端的 session 檢查還沒做。資料全部來自 FAKE_PROFILE。
 *
 * 路由取名 /home 而非 /dashboard：landing 是給「還沒登入的人」看的，
 * 這裡才是登入後的家。命名照使用者的心智模型，不照技術慣例。
 *
 * 殼（側邊欄、頂部列、TabBar）在 AppShell。個人資料卡與邀請卡是這一頁特有的：
 * 桌機在側邊欄，窄版分別落到主內容的上方與下方 —— 所以各傳兩次。
 */
export default async function HomePage() {
	const dict = await getDictionary();
	return (
		<AppShell
			current="home"
			beforeNav={<ProfileCard />}
			afterNav={<InviteCard />}
			mobileTop={<ProfileCard />}
			mobileBottom={<InviteCard />}
		>
			<ScheduleSection />
			<MonstersSection />
			{/* 從結束的房間被送回來時才會彈（看 ?ended=） */}
			<RoomEndedNotice dict={dict.room} closeLabel={dict.common.close} confirmLabel={dict.common.confirm} />
		</AppShell>
	);
}
