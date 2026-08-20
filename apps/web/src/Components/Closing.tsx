import Image from "next/image";
import { getDictionary } from "@/dictionaries";

/**
 * 底部 CTA 區塊。
 *
 * 拆解原則：只有怪獸是圖，其餘全部用 code —— 弧線用 CSS border-radius（見 .arc-top）、
 * 底色用 token、文字要 i18n、按鈕要可互動。整塊切成一張圖會同時失去這四件事。
 *
 * 怪獸素材來自 wave.png（原始點陣圖，非 wave.svg）—— 該 SVG 是描邊產生的，
 * 624 個 path、613KB，且把 48,948 種顏色壓成 31 種，毛髮與漸層全失真。
 */
export default async function Closing() {
	const dict = await getDictionary();

	return (
		<section className="arc-top mt-10 overflow-hidden bg-primary-50 pt-10 pb-14 sm:pt-14">
			<div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-5 sm:px-8 lg:flex-row lg:items-end lg:gap-10">
				{/*
				 * 怪獸：桌機在左、手機置頂置中。
				 *
				 * 設計稿裡牠的腳是被裁掉的（怪獸 y 1452–1535，畫布底 1536），不是完整站著 ——
				 * 用負的 margin-bottom 往下溢出，靠 section 的 overflow-hidden 切掉，
				 * 視覺上像是從弧線後面站起來。切掉的量與弧高同步縮放。
				 */}
				<Image
					src="/images/monster-wave.webp"
					alt=""
					width={512}
					height={419}
					sizes="(max-width: 640px) 128px, (max-width: 1024px) 176px, 224px"
					className="-mb-14 h-auto w-32 shrink-0 sm:-mb-16 sm:w-44 lg:-mb-20 lg:w-56"
				/>

				<div className="pb-4 text-center lg:pb-10 lg:text-left">
					<h2 className="text-2xl font-extrabold sm:text-3xl lg:text-4xl">
						{dict.closing.title}
					</h2>
					{/* 註冊流程尚未實作 —— 依決策不給連結 */}
					<span className="mt-6 inline-flex cursor-default items-center gap-2 rounded-full bg-primary-500 px-7 py-3.5 font-extrabold text-white">
						{dict.closing.cta}
						<span aria-hidden="true">→</span>
					</span>
				</div>
			</div>
		</section>
	);
}
