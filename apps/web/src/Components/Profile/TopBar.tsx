import LocaleSwitch from "@/Components/LocaleSwitch";
import TokenCount from "@/Components/UI/TokenCount";
import { getDictionary, getLocale, locales } from "@/dictionaries";
import AccountMenu from "./AccountMenu";
import NotificationBell from "./NotificationBell";
import { FAKE_PROFILE } from "./profileData";

/**
 * 頂部列：語言切換、代幣、通知、帳號。手機版會跟品牌列併在同一排（見 page.tsx）。
 *
 * 語言切換放最左而不是最右：頭像留在最右角是通用慣例，使用者找帳號選單會往那裡看。
 *
 * 帳號選單（AccountMenu，client）目前只有登出，頭像從 ProfileProvider 來。
 * 通知（NotificationBell，client）走 /api/me/notifications，徽章數搭心跳。
 * ⚠️ 代幣仍是 FAKE_PROFILE。
 */
export default async function TopBar() {
	const dict = await getDictionary();
	const locale = await getLocale();
	const { topBar } = dict.profile;
	const p = FAKE_PROFILE;

	return (
		<div className="flex items-center gap-2 sm:gap-3">
			<LocaleSwitch current={locale} locales={locales} label={dict.nav.language} />

			{/*
			 * 代幣在 sm 以下收起來 —— 那一排在手機上要塞品牌列、語言切換、通知、頭像，
			 * 375px 根本不夠。個人資料卡本來就有代幣數，收起來不會漏資訊。
			 */}
			<span className="hidden rounded-full border border-ink-100 bg-surface px-3 py-1.5 sm:inline-block">
				<TokenCount count={p.tokens} label={topBar.tokens} />
			</span>

			<NotificationBell locale={locale} dict={dict.profile.notifications} />

			<AccountMenu locale={locale} label={topBar.account} logoutLabel={topBar.logout} />
		</div>
	);
}
