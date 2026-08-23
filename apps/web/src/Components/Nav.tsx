import Image from "next/image";
import Link from "next/link";
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
					<LocaleSwitch current={locale} />
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

const LOCALE_LABEL: Record<string, string> = { "en": "EN", "zh-TW": "中" };

/**
 * 語言切換。視覺稿沒有這個元件，但有 i18n 就必須有切換入口，
 * 否則使用者會被 Accept-Language 鎖死。
 * TODO: 目前切換後回首頁；要保留當前路徑需改為 Client Component 讀 usePathname。
 */
function LocaleSwitch({ current }: { current: string }) {
	return (
		<div className="flex items-center rounded-full border border-ink-200 p-0.5">
			{locales.map((locale) => (
				<Link
					key={locale}
					href={`/${locale}`}
					aria-current={locale === current ? "true" : undefined}
					className={`rounded-full px-2.5 py-1 text-xs font-extrabold transition-colors ${
						locale === current
							? "bg-primary-500 text-white"
							: "text-ink-400 hover:text-primary-600"
					}`}
				>
					{LOCALE_LABEL[locale] ?? locale}
				</Link>
			))}
		</div>
	);
}
