import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";
import { asset } from "@/asset";
import { getDictionary, getLocale } from "@/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
	const dict = await getDictionary();
	return { title: `${dict.home.greeting} — MonsterTalk` };
}

/**
 * 登入後的個人首頁 —— 目前是 placeholder。
 *
 * ⚠️ 這一頁沒有任何存取保護。登入是假的（見 AuthForm 的 FAKE_AUTH），
 *    直接輸入網址就能進來。接上真正的 auth 之前不要放任何真實資料。
 *
 * 路由取名 /home 而非 /dashboard：landing 是給「還沒登入的人」看的，
 * 這裡才是登入後的家。命名要照使用者的心智模型，不是照技術慣例。
 *
 * 垂直置中只在 sm 以上做，且用 my-auto 而非 justify-center，理由見 AuthShell 的註解。
 */
export default async function HomePage() {
	const dict = await getDictionary();
	const locale = await getLocale();
	const { home } = dict;

	return (
		<main className="flex min-h-dvh flex-col items-center px-5 pt-10 pb-8 text-center sm:py-12">
			<div className="flex flex-col items-center sm:my-auto">
				<Image
					src={asset("/images/monster-wave.webp")}
					alt=""
					width={512}
					height={419}
					sizes="176px"
					className="mb-6 h-auto w-44"
				/>

				<span className="mb-4 rounded-full bg-token/20 px-3.5 py-1.5 text-xs font-extrabold text-ink-600">
					{home.underConstruction}
				</span>

				<h1 className="text-3xl font-extrabold sm:text-4xl">{home.greeting}</h1>
				<p className="mt-3 max-w-md text-ink-500">{home.subtitle}</p>

				{/* 假登入的警語直接寫在頁面上，免得有人以為這頁受保護 */}
				<p className="mt-6 max-w-md rounded-2xl bg-surface px-5 py-4 text-sm leading-relaxed text-ink-400 shadow-[0_1px_2px_rgba(13,24,82,.05)]">
					{home.note}
				</p>

				<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
					<Link
						href={`/${locale}`}
						className="rounded-full bg-primary-500 px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-600"
					>
						{home.backLanding}
					</Link>
					{/* 沒有 session 可以清，登出等同回首頁 */}
					<Link
						href={`/${locale}`}
						className="rounded-full border-2 border-ink-200 px-6 py-3 text-sm font-extrabold transition-colors hover:border-primary-400 hover:text-primary-600"
					>
						{home.logout}
					</Link>
				</div>
			</div>
		</main>
	);
}
