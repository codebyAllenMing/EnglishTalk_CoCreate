import { Settings } from "lucide-react";
import type { Metadata } from "next";
import AppShell from "@/Components/Profile/AppShell";
import { AVATAR_CATALOG } from "@/Components/Profile/avatarChoices";
import SettingsForm from "@/Components/Profile/Settings/SettingsForm";
import { getDictionary, getLocale } from "@/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
	const dict = await getDictionary();
	return { title: `${dict.profile.settings.title} — MonsterTalk` };
}

/**
 * 個人設定 —— 編輯自己的怪獸與基本資料（設計稿 `assets/design/Profile Setting.jpg`）。
 *
 * 原本是個人資料卡上的對話框，使用者 2026-09-21 與夥伴討論後改成獨立頁面。
 * 側邊欄只有導覽、沒有個人資料卡：你正在編輯的東西不該同時顯示在旁邊。
 *
 * 這一層只負責把字典與語系餵給 client 的表單；初始值由表單自己從 ProfileProvider 拿。
 */
export default async function SettingsPage() {
	const dict = await getDictionary();
	const locale = await getLocale();
	const s = dict.profile.settings;

	return (
		<AppShell
			current="settings"
			heading={
				<div>
					<h1 className="flex items-center gap-2.5 text-2xl font-extrabold">
						<Settings aria-hidden="true" className="size-6 text-primary-500" />
						{s.title}
					</h1>
					<p className="mt-0.5 text-sm text-ink-500">{s.hint}</p>
				</div>
			}
		>
			<SettingsForm
				locale={locale}
				choices={AVATAR_CATALOG}
				dict={s}
				langDict={dict.profile.lang}
				levelDict={dict.profile.level}
				monstersDict={dict.profile.monsters}
				closeLabel={dict.common.close}
				cancelLabel={dict.common.cancel}
			/>
		</AppShell>
	);
}
