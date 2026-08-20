import { asset } from "@/asset";
import { getDictionary } from "@/dictionaries";

export default async function Hero() {
	const dict = await getDictionary();
	const { hero } = dict;

	return (
		<section className="mx-auto grid max-w-6xl items-center gap-8 px-5 pt-10 pb-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-4 lg:pt-16">
			<div className="order-2 lg:order-1">
				<span className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-surface px-3.5 py-1.5 text-xs font-bold text-ink-600">
					<span aria-hidden="true" className="text-token">
						★
					</span>
					{hero.eyebrow}
				</span>

				<h1 className="mt-5 text-5xl leading-[1.05] font-extrabold sm:text-6xl lg:text-7xl">
					{hero.line1Pre}
					<span className="text-primary-500">{hero.line1Accent}</span>
					{hero.line1Post}
					<br />
					{hero.line2Pre}
					<span className="text-secondary-500">{hero.line2Accent}</span>
					{hero.line2Post}
				</h1>

				<p className="mt-5 max-w-md text-lg text-ink-600">
					{hero.subtitle}
					<br />
					{hero.subtitleCasual}
					<span className="font-extrabold text-lang-zh">{hero.subtitleNot}</span>
					{hero.subtitleCareless}
				</p>

				<div className="mt-8 flex flex-wrap items-center gap-3">
					{/* 目的地頁面尚未實作 —— 依決策不給連結 */}
					<span className="inline-flex cursor-default items-center gap-2 rounded-full bg-primary-500 px-6 py-3.5 font-extrabold text-white">
						{hero.ctaPrimary}
						<span aria-hidden="true">→</span>
					</span>
					<span className="inline-flex cursor-default items-center gap-2 rounded-full border-2 border-ink-200 bg-surface px-6 py-3.5 font-extrabold">
						<span aria-hidden="true">▶</span>
						{hero.ctaSecondary}
					</span>
				</div>
			</div>

			{/*
			 * 桌機與手機是兩種不同構圖（art direction），不是同一張圖縮放，
			 * 因此用 <picture> 讓瀏覽器只下載命中的那一張。
			 *
			 * 圖片底部為硬切邊（原稿桌椅在畫布底部即被裁斷），
			 * 必須貼齊區塊底部，不可浮空，否則會看到橫向切線。
			 */}
			<div className="order-1 self-end lg:order-2">
				<picture>
					<source
						media="(min-width: 1024px)"
						srcSet={asset("/images/banner-cutout.webp")}
						width={998}
						height={867}
					/>
					<img
						src={asset("/images/banner-mb-cutout.webp")}
						alt={hero.imageAlt}
						width={1164}
						height={944}
						fetchPriority="high"
						decoding="async"
						className="mx-auto h-auto w-full max-w-[560px] lg:max-w-none"
					/>
				</picture>
			</div>
		</section>
	);
}
