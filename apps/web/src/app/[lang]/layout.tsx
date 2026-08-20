import type { Metadata } from "next";
import { Nunito, Noto_Sans_TC } from "next/font/google";
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
		<html lang={lang} className={`${nunito.variable} ${notoSansTC.variable}`}>
			<body className="font-sans">{children}</body>
		</html>
	);
}
