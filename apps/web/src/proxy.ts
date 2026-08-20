import { NextResponse, type NextRequest } from "next/server";

const locales = ["en", "zh-TW"] as const;
const defaultLocale = "en";

/**
 * 由 Accept-Language 推斷語系。只有兩個語系，不值得為此引入
 * Negotiator + intl-localematcher 兩個依賴。
 */
function detectLocale(request: NextRequest): string {
	const header = request.headers.get("accept-language");
	if (!header) return defaultLocale;

	const preferred = header
		.split(",")
		.map((part) => {
			const [tag, q] = part.trim().split(";q=");
			return { tag: tag.trim().toLowerCase(), q: q ? Number.parseFloat(q) : 1 };
		})
		.filter((entry) => entry.tag.length > 0 && !Number.isNaN(entry.q))
		.sort((a, b) => b.q - a.q);

	for (const { tag } of preferred) {
		if (tag.startsWith("zh")) return "zh-TW";
		if (tag.startsWith("en")) return "en";
	}
	return defaultLocale;
}

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const hasLocale = locales.some(
		(locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
	);
	if (hasLocale) return;

	const locale = detectLocale(request);
	request.nextUrl.pathname = `/${locale}${pathname}`;
	return NextResponse.redirect(request.nextUrl);
}

export const config = {
	// 排除 _next 內部路徑、api，以及任何帶副檔名的靜態資源
	matcher: ["/((?!_next|api|.*\\.).*)"],
};
