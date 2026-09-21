import { Bell } from "lucide-react";
import LocaleSwitch from "@/Components/LocaleSwitch";
import Avatar from "@/Components/UI/Avatar";
import CountBadge from "@/Components/UI/CountBadge";
import TokenCount from "@/Components/UI/TokenCount";
import { getDictionary, getLocale, locales } from "@/dictionaries";
import AccountMenu from "./AccountMenu";
import { FAKE_PROFILE } from "./profileData";

/**
 * 頂部列：語言切換、代幣、通知、帳號。手機版會跟品牌列併在同一排（見 page.tsx）。
 *
 * 語言切換放最左而不是最右：頭像留在最右角是通用慣例，使用者找帳號選單會往那裡看。
 *
 * 帳號選單（AccountMenu，client）目前只有登出。通知還沒有內容，等真的有東西可展開再說。
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

			<button
				type="button"
				aria-label={topBar.notifications}
				className="relative rounded-full p-1.5 text-ink-600 transition-colors hover:text-primary-600"
			>
				<Bell aria-hidden="true" className="size-5" />
				{/* badge 疊在鈴鐺右上角，超出按鈕範圍是刻意的 */}
				<span className="absolute -top-0.5 -right-1">
					<CountBadge count={p.notifications} label={topBar.notifications} />
				</span>
			</button>

			<AccountMenu
				locale={locale}
				label={topBar.account}
				logoutLabel={topBar.logout}
				avatar={<Avatar src={p.avatar} className="w-9" sizes="36px" />}
			/>
		</div>
	);
}
