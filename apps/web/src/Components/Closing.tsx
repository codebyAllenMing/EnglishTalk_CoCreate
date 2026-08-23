import Image from "next/image";
import Link from "next/link";
import { asset } from "@/asset";
import { getDictionary, getLocale } from "@/dictionaries";

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
	const locale = await getLocale();

	return (
		<section className="arc-top mt-10 overflow-hidden bg-primary-50 pt-10 pb-14 sm:pt-14">
			<div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-5 sm:px-8 lg:flex-row lg:items-end lg:gap-10">
				{/*
				 * 怪獸：桌機在左、手機置頂置中。
				 *
				 * 設計稿裡牠的腳是被裁掉的（怪獸 y 1452–1535，畫布底 1536），不是完整站著 ——
				 * 用負的 margin-bottom 往下溢出，靠 section 的 overflow-hidden 切掉，
				 * 視覺上像是從弧線後面站起來。
				 *
				 * ⚠️ 那個負值**只能在 lg 以上**。lg 是 flex-row，負 margin 的效果是自己往下溢出；
				 *    一掉到 lg 以下就變成 flex-col，同一個負值會改成把**下一個元素往上拉**，
				 *    標題直接被拉進怪獸肚子裡（2026-08-23 回報）。
				 *    直排時腳本來也不該被裁 —— 弧線在 section 頂端，怪獸不在它後面。
				 */}
				<Image
					src={asset("/images/monster-wave.webp")}
					alt=""
					width={512}
					height={419}
					sizes="(max-width: 640px) 128px, (max-width: 1024px) 176px, 224px"
					className="h-auto w-32 shrink-0 sm:w-44 lg:-mb-20 lg:w-56"
				/>

				<div className="pb-4 text-center lg:pb-10 lg:text-left">
					<h2 className="text-2xl font-extrabold sm:text-3xl lg:text-4xl">
						{dict.closing.title}
					</h2>
					<Link
						href={`/${locale}/signup`}
						className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary-500 px-7 py-3.5 font-extrabold text-white transition-colors hover:bg-primary-600"
					>
						{dict.closing.cta}
						<span aria-hidden="true">→</span>
					</Link>
				</div>
			</div>
		</section>
	);
}
