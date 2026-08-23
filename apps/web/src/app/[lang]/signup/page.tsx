import { Mail, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import AuthDivider from "@/Components/AuthDivider";
import AuthField from "@/Components/AuthField";
import AuthForm from "@/Components/AuthForm";
import AuthShell from "@/Components/AuthShell";
import PasswordField from "@/Components/PasswordField";
import { getDictionary, getLocale } from "@/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
	const dict = await getDictionary();
	return { title: `${dict.signup.title} — MonsterTalk` };
}

/**
 * 註冊頁 —— 目前僅實作 UI，不串 API。
 *
 * 表單送出只做「兩次密碼是否一致」的檢查，其餘直接轉頁（見 AuthForm 的 FAKE_AUTH）。
 *
 * 欄位為顯示名稱 / email / 密碼 / 確認密碼。母語、想學語言、程度、avatar
 * 這些 profile 欄位不放進註冊流程 —— 屬於個人主頁的範疇，且現在還沒有地方用。
 * displayName 是例外：社群產品在使用者出現的第一刻就需要一個稱呼。
 */
export default async function SignupPage() {
	const dict = await getDictionary();
	const locale = await getLocale();
	const { signup } = dict;

	return (
		<AuthShell title={signup.title} subtitle={signup.subtitle} backHome={signup.backHome} monster="stand">
			<AuthForm
				submitLabel={signup.submit}
				redirectTo={`/${locale}/home`}
				mismatchMessage={signup.passwordMismatch}
				fields={
					<>
						<AuthField
							id="displayName"
							icon={User}
							label={signup.displayName}
							type="text"
							// nickname 而非 name：這是對外顯示的稱呼，不是真實姓名
							autoComplete="nickname"
							placeholder={signup.displayNamePlaceholder}
						/>
						<AuthField
							id="email"
							icon={Mail}
							label={signup.email}
							type="email"
							autoComplete="email"
							placeholder={signup.emailPlaceholder}
						/>
						<PasswordField
							id="password"
							label={signup.password}
							// new-password 讓密碼管理器提議新密碼，而不是自動填入舊的
							autoComplete="new-password"
							placeholder="••••••••"
							hint={signup.passwordHint}
							showLabel={dict.form.showPassword}
							hideLabel={dict.form.hidePassword}
						/>
						<PasswordField
							id="confirmPassword"
							label={signup.confirmPassword}
							autoComplete="new-password"
							placeholder="••••••••"
							showLabel={dict.form.showPassword}
							hideLabel={dict.form.hidePassword}
						/>
					</>
				}
			/>

			<AuthDivider
				label={signup.divider}
				google={signup.google}
				redirectTo={`/${locale}/home`}
			/>

			{/* 服務條款與隱私權政策頁面尚未存在 —— 依決策不給連結，先以純文字呈現 */}
			<p className="mt-5 text-center text-xs leading-relaxed text-ink-400">{signup.terms}</p>

			<p className="mt-4 text-center text-sm text-ink-500">
				{signup.hasAccount}{" "}
				<Link
					href={`/${locale}/login`}
					className="font-extrabold text-primary-600 hover:underline"
				>
					{signup.loginLink}
				</Link>
			</p>
		</AuthShell>
	);
}
