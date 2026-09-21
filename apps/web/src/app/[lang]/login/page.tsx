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
 * 登入頁。送出打 apps/api 的 POST /api/auth/sign-in/email（見 src/auth/client.ts），
 * 成功後 session 在 httpOnly cookie 裡、轉到 /home；失敗把錯誤顯示在按鈕上方。
 *
 * ⚠️ Google 登入仍是純視覺（AuthDivider），社群登入之後再接。
 */
export default async function LoginPage() {
	const dict = await getDictionary();
	const locale = await getLocale();
	const { login } = dict;

	return (
		<AuthShell title={login.title} subtitle={login.subtitle} backHome={login.backHome} monster="wave">
			<AuthForm
				mode="login"
				submitLabel={login.submit}
				redirectTo={`/${locale}/home`}
				errors={dict.form.errors}
				fields={
					<>
						<AuthField
							id="email"
							icon={Mail}
							label={login.email}
							type="email"
							autoComplete="email"
							placeholder={login.emailPlaceholder}
							required
						/>
						<PasswordField
							id="password"
							label={login.password}
							autoComplete="current-password"
							placeholder="••••••••"
							showLabel={dict.form.showPassword}
							hideLabel={dict.form.hidePassword}
							required
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
