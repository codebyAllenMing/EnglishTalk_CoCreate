import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { asset } from "@/asset";
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
		<main className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
			<Link href={`/${locale}`} className="mb-8 flex items-center gap-2.5">
				<Image
						src={asset("/images/monster-64.png")}
						alt=""
						width={32}
						height={32}
						className="size-8"
						priority
					/>
				<span className="text-lg font-extrabold tracking-tight">MonsterTalk</span>
			</Link>

			<div className="w-full max-w-sm rounded-2xl bg-surface p-7 shadow-[0_1px_2px_rgba(13,24,82,.05),0_10px_30px_rgba(13,24,82,.06)]">
				<h1 className="text-2xl font-extrabold">{login.title}</h1>
				<p className="mt-1.5 mb-6 text-sm text-ink-500">{login.subtitle}</p>

				<form className="flex flex-col gap-4">
					<div>
						<label htmlFor="email" className="mb-1.5 block text-xs font-extrabold text-ink-600">
							{login.email}
						</label>
						<input
							id="email"
							type="email"
							name="email"
							autoComplete="email"
							placeholder={login.emailPlaceholder}
							className="w-full rounded-xl border-2 border-ink-200 bg-surface px-3.5 py-2.5 placeholder:text-ink-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none"
						/>
					</div>

					<div>
						<label htmlFor="password" className="mb-1.5 block text-xs font-extrabold text-ink-600">
							{login.password}
						</label>
						<input
							id="password"
							type="password"
							name="password"
							autoComplete="current-password"
							placeholder="••••••••"
							className="w-full rounded-xl border-2 border-ink-200 bg-surface px-3.5 py-2.5 placeholder:text-ink-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none"
						/>
					</div>

					<button
						type="submit"
						className="mt-2 w-full rounded-full bg-primary-500 py-3 font-extrabold text-white transition-colors hover:bg-primary-600"
					>
						{login.submit}
					</button>
				</form>

				<div className="my-5 flex items-center gap-3 text-xs font-bold text-ink-300">
					<span className="h-px flex-1 bg-ink-100" />
					{login.divider}
					<span className="h-px flex-1 bg-ink-100" />
				</div>

				{/* OAuth 尚未接上 —— 依決策不給連結 */}
				<span className="block w-full cursor-default rounded-full border-2 border-ink-200 py-3 text-center font-extrabold">
					{login.google}
				</span>

				<p className="mt-6 text-center text-sm text-ink-500">
					{login.noAccount}{" "}
					{/* 註冊頁尚未實作 */}
					<span className="cursor-default font-extrabold text-primary-600">{login.signupLink}</span>
				</p>
			</div>

			<Link
				href={`/${locale}`}
				className="mt-8 text-sm font-semibold text-ink-400 hover:text-primary-600"
			>
				← {login.backHome}
			</Link>
		</main>
	);
}
