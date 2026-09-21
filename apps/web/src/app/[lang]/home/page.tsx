import type { Metadata } from "next";
import AppShell from "@/Components/Profile/AppShell";
import InviteCard from "@/Components/Profile/InviteCard";
import MonstersSection from "@/Components/Profile/Monsters/MonstersSection";
import ProfileCard from "@/Components/Profile/ProfileCard";
import ScheduleSection from "@/Components/Profile/Schedule/ScheduleSection";
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
 * 殼（側邊欄、頂部列、TabBar）在 AppShell。個人資料卡與邀請卡是這一頁特有的：
 * 桌機在側邊欄，窄版分別落到主內容的上方與下方 —— 所以各傳兩次。
 */
export default function HomePage() {
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
		</AppShell>
	);
}
