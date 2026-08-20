import Nav from "@/Components/Nav";
import Hero from "@/Components/Hero";
import Features from "@/Components/Features";
import HowItWorks from "@/Components/HowItWorks";
import Stats from "@/Components/Stats";
import Testimonials from "@/Components/Testimonials";
import Closing from "@/Components/Closing";
import Footer from "@/Components/Footer";

/**
 * Landing Page。
 *
 * ⚠️ 統計面板（Stats）的數字全是假的 —— 2026-08-20 決定先照視覺稿放 placeholder，
 * 不做真實串接。上線前必須換掉或移除，grep "FAKE_" 可找出所有待處理的假內容。
 *
 * ⚠️ 使用者評價（Testimonials）的三則評價與人物同樣是虛構的，一併適用上述決定。
 *
 * 決策紀錄見 vault 的 landing-page-spec.md。
 */
export default function LandingPage() {
	return (
		<>
			<Nav />
			<main>
				<Hero />
				<Features />
				<section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
					{/*
					 * 視覺稿裡步驟區與統計面板是左右兩欄，窄螢幕才上下堆疊。
					 * 420px 是量出來的：稿上內容區 919px、面板 350px，佔 38%。
					 */}
					<div className="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-12">
						<HowItWorks />
						<Stats />
					</div>
				</section>
				<Testimonials />
				<Closing />
			</main>
			<Footer />
		</>
	);
}
