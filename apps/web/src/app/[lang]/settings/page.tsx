import { Settings } from "lucide-react";
import type { Metadata } from "next";
import AppShell from "@/Components/Profile/AppShell";
import { FAKE_AVATAR_CHOICES } from "@/Components/Profile/avatarChoices";
import { FAKE_PROFILE } from "@/Components/Profile/profileData";
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
 * 這一層只負責把字典、語系與初始值餵給 client 的表單；接上 API 時改這裡就好。
 */
export default async function SettingsPage() {
	const dict = await getDictionary();
	const locale = await getLocale();
	const s = dict.profile.settings;
	const p = FAKE_PROFILE;

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
				initial={{
					// FAKE_PROFILE.avatar 存的是檔名（avatar-allen），挑選清單用的是 id（allen）
					avatar: p.avatar.replace(/^avatar-/, ""),
					name: p.name,
					country: p.country,
					gender: p.gender,
					native: p.nativeCode,
					nativeLevel: p.nativeLevel,
					learning: p.learningCode,
					learningLevel: p.level,
					// 興趣是自由字串；假資料存代碼，這裡換成當前語系的文字
					interests: p.interests.map((code) => s.interestOptions[code]),
					bio: dict.profile.demo.bio,
				}}
				choices={FAKE_AVATAR_CHOICES}
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
