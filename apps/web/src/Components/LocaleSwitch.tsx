"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LOCALE_LABEL: Record<string, string> = { "en": "EN", "zh-TW": "中" };

type Props = {
	current: string;
	/** 由 Server Component 傳入 —— dictionaries.ts 相依 next/root-params，不能進 client bundle */
	locales: readonly string[];
	label: string;
};

/**
 * 語言切換。視覺稿沒有這個元件，但有 i18n 就必須有切換入口，
 * 否則使用者會被 Accept-Language 鎖死。
 *
 * 這是全站唯一需要 client 的地方，理由只有一個：**切換後要留在原本那一頁**。
 * 先前它寫死回首頁，在 landing 上看不出差別（本來就在首頁），
 * 但放到登入 / 註冊頁就會變成「填到一半切語言，整頁跑掉」。
 *
 * `usePathname()` 回傳的路徑**不含 basePath**（Next 會剝掉），而 `<Link>` 又會自己補上，
 * 所以這裡直接操作路徑字串就好，不必碰 basePath —— 靜態部署到 Pages 上也是對的。
 * 尾斜線同理：dev 拿到 `/zh-TW/login`、靜態站拿到 `/zh-TW/login/`，
 * 換掉第一段之後兩邊各自維持原本的形狀，不會多一次 308。
 */
export default function LocaleSwitch({ current, locales, label }: Props) {
	const pathname = usePathname();
	const rest = pathname.replace(/^\/[^/]*/, "");

	return (
		<div
			role="group"
			aria-label={label}
			className="flex items-center rounded-full border border-ink-200 bg-surface/70 p-0.5 backdrop-blur"
		>
			{locales.map((locale) => (
				<Link
					key={locale}
					href={`/${locale}${rest || "/"}`}
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
