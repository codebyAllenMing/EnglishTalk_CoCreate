import { Mail } from "lucide-react";
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
	return { title: `${dict.login.title} — MonsterTalk` };
}

/**
 * 登入頁 —— 目前僅實作 UI。
 * 認證流程（provider、session、users 表）尚未定案，因此表單沒有 action，
 * 提交不會發生任何事。實作 auth 時再決定要不要轉成 Client Component。
 */
export default async function LoginPage() {
	const dict = await getDictionary();
	const locale = await getLocale();
	const { login } = dict;

	return (
		<AuthShell title={login.title} subtitle={login.subtitle} backHome={login.backHome} monster="wave">
			<AuthForm
				submitLabel={login.submit}
				redirectTo={`/${locale}/home`}
				fields={
					<>
						<AuthField
							id="email"
							icon={Mail}
							label={login.email}
							type="email"
							autoComplete="email"
							placeholder={login.emailPlaceholder}
						/>
						<PasswordField
							id="password"
							label={login.password}
							autoComplete="current-password"
							placeholder="••••••••"
							showLabel={dict.form.showPassword}
							hideLabel={dict.form.hidePassword}
						/>
					</>
				}
			/>

			<AuthDivider label={login.divider} google={login.google} redirectTo={`/${locale}/home`} />

			<p className="mt-6 text-center text-sm text-ink-500">
				{login.noAccount}{" "}
				<Link
					href={`/${locale}/signup`}
					className="font-extrabold text-primary-600 hover:underline"
				>
					{login.signupLink}
				</Link>
			</p>
		</AuthShell>
	);
}
