import type { Metadata } from "next";
import { Nunito, Noto_Sans_TC } from "next/font/google";
import SignedInRedirect from "@/auth/SignedInRedirect";
import { getDictionary, locales } from "@/dictionaries";
import "../globals.css";

const nunito = Nunito({
	subsets: ["latin"],
	variable: "--font-nunito",
	display: "swap",
});

// CJK 字體檔案體積大，關閉預載，由瀏覽器在需要時才抓
const notoSansTC = Noto_Sans_TC({
	weight: ["400", "700", "900"],
	preload: false,
	variable: "--font-noto-tc",
	display: "swap",
});

export async function generateStaticParams() {
	return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
	const dict = await getDictionary();
	return {
		title: dict.meta.title,
		description: dict.meta.description,
	};
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
	const { lang } = await params;

	return (
		// suppressHydrationWarning 只管 <html> 這一層：iOS 版 Chrome 會自己在 <html> 塞 __gcrremoteframetoken 屬性，
		// dev 的 hydration 比對會報不一致（2026-09-23 手機測試撞到）；跟我們的程式無關，其他元素不受影響
		<html lang={lang} className={`${nunito.variable} ${notoSansTC.variable}`} suppressHydrationWarning>
			<body className="font-sans">
				{/* 入口守門：一進站問一次 session，已登入的人在公開頁（landing / login / signup）會被送去 /home */}
				<SignedInRedirect locale={lang} />
				{children}
			</body>
		</html>
	);
}
