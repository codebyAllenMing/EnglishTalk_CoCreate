import Image from "next/image";
import Link from "next/link";
import LocaleSwitch from "@/Components/LocaleSwitch";
import { asset } from "@/asset";
import { getDictionary, getLocale, locales } from "@/dictionaries";

/**
 * 導覽列。
 * How it works / Features / Community / Blog 對應的頁面在 MVP 不存在，
 * 依決策「不存在的頁面不給連結、不做任何轉導」，這四項為純視覺元素。
 */
export default async function Nav() {
	const dict = await getDictionary();
	const locale = await getLocale();

	const deadLinks = [dict.nav.howItWorks, dict.nav.features, dict.nav.community, dict.nav.blog];

	return (
		<header className="sticky top-0 z-30 border-b border-ink-100/70 bg-cream/85 backdrop-blur">
			<nav className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-5 sm:px-8">
				<Link href={`/${locale}`} className="flex shrink-0 items-center gap-2.5">
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

				<ul className="ml-4 hidden items-center gap-6 lg:flex">
					{deadLinks.map((label) => (
						<li key={label} className="cursor-default text-sm font-semibold text-ink-500">
							{label}
						</li>
					))}
				</ul>

				<div className="ml-auto flex items-center gap-2 sm:gap-3">
					<LocaleSwitch current={locale} locales={locales} label={dict.nav.language} />
					<Link
						href={`/${locale}/login`}
						className="rounded-full border-2 border-ink-200 px-4 py-2 text-sm font-extrabold transition-colors hover:border-primary-400 hover:text-primary-600"
					>
						{dict.nav.login}
					</Link>
					<Link
						href={`/${locale}/signup`}
						className="hidden rounded-full bg-primary-500 px-4 py-2 text-sm font-extrabold text-white transition-colors hover:bg-primary-600 sm:inline-block"
					>
						{dict.nav.signup}
					</Link>
				</div>
			</nav>
		</header>
	);
}
