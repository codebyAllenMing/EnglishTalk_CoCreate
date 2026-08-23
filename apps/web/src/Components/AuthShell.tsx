import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import LocaleSwitch from "@/Components/LocaleSwitch";
import { asset } from "@/asset";
import { getDictionary, getLocale, locales } from "@/dictionaries";

type Props = {
	title: string;
	subtitle: string;
	backHome: string;
	/** 卡片右下那隻青綠怪獸的動作：登入用揮手，註冊用站姿 */
	monster: "wave" | "stand";
	children: ReactNode;
};

/**
 * 登入 / 註冊共用的外框：背景、品牌列、置中卡片、三隻怪獸、返回首頁。
 *
 * 兩頁的差異只有卡片內容與那隻青綠怪獸的動作，外框抽出來的理由不是「少打幾行」，
 * 而是兩頁的視覺必須完全一致 —— 使用者會在這兩頁之間來回，
 * 卡片寬度或陰影差一點點都會看得出來。
 *
 * ## 怪獸的定位
 *
 * 三隻都掛在**卡片**這層 relative 上，不是掛在視窗上 —— 設計稿裡它們是繞著卡片
 * 排的，跟著視窗跑會在寬螢幕上被甩開。百分比全部以卡片的寬高為基準，數值直接
 * 換算自設計稿（單一畫面 768×1024、卡片 x143–626 y102–951）：
 *
 *   紫    右緣貼卡片左緣，寬 36.7%，距卡片頂 96px     ← 卡片下層
 *   粉紅  右緣超出卡片 23.6%，寬 37.7%，距卡片頂 160px  ← 卡片下層
 *   青綠  右緣超出卡片 24.0%，寬 44.7%，底部超出 44px    ← 卡片上層，壓在卡片右下角
 *
 * 設計稿上紫與粉紅有一大半被卡片蓋住，只露出外緣 —— 那是刻意的，所以卡片給
 * `z-10`、這兩隻留在 `z-0`，青綠則是 `z-20` 壓上去。
 *
 * ⚠️ 垂直一律用 px 而不是百分比 —— 註冊頁的卡片比登入頁高 240px，用百分比的話
 *    兩頁之間切換時怪獸會整個跳位，而使用者正是會在這兩頁來回的。
 *    卡片在 sm 以上寬度固定 384px，px 不會失準。
 *
 * ⚠️ 但 px 不能照抄設計稿的 206 / 280 —— 設計稿的卡片有 849px 高（多了分頁切換、
 *    Forgot password、Apple 登入），實際只有 520px，垂直空間少了四成。
 *    照抄的話粉紅的下巴會直接壓在青綠頭上（實測只差 11px）。
 *    現在的 96 / 160 是把設計稿的相對位置壓縮進 520px，並確保粉紅底部離青綠頭
 *    還有 70px。改動卡片內容（加欄位、加 Apple 登入）時要重算這兩個值。
 *
 * 手機版只留青綠：另外兩隻在窄螢幕上會整隻被卡片蓋掉，載了也看不到。
 *
 * ## 兩個 RWD 決定
 *
 * **垂直置中只在 sm 以上做**（`sm:justify-center-safe`）。手機版靠上排，因為登入頁
 * 內容只有約 610px，在 700px 的視窗裡置中會在頂端留下 40 幾 px 的空白，像沒對齊。
 *
 * ⚠️⚠️ 置中一定要用 **`justify-center-safe`**（`justify-content: safe center`），
 *    `justify-center` 和 `my-auto` 都不行 —— 兩者在內容高於容器時都會往**上下兩端**
 *    溢出，捲動只能往下，被推到負座標的上半部永遠捲不回來。
 *    踩過兩次：手機版註冊頁（內容 686px / 可用 553px），以及桌機版註冊頁
 *    （內容 958px / 筆電可視高度 800–900px）。`safe` 的作用就是內容放不下時
 *    自動退回 start 對齊，正好治這個。不支援 safe 的瀏覽器整條宣告失效、退回
 *    flex-start，也就是靠上排 —— 降級行為剛好也是我們要的。
 *
 * **返回首頁在手機版移到品牌列右側**，與 logo 同一列。不用 absolute 定位是因為
 * 在 320px 窄螢幕上，置中的 logo 右緣會與右上角的連結左緣重疊。
 */
export default async function AuthShell({ title, subtitle, backHome, monster, children }: Props) {
	const locale = await getLocale();
	const dict = await getDictionary();

	return (
		/*
		 * ⚠️ 這裡一定要 overflow-x-clip，不能用 overflow-hidden。
		 *    怪獸刻意超出卡片，不裁的話視窗會多出橫向捲軸；但 `overflow: hidden`
		 *    是**兩軸一起**裁的，註冊頁卡片 746px 高，超出視窗的下半截會直接消失
		 *    且捲不到。`overflow-x: clip` 只管水平，而且 clip 不建立捲動容器。
		 */
		<main className="relative flex min-h-dvh flex-col items-center justify-start overflow-x-clip px-5 pt-10 pb-24 sm:justify-center-safe sm:py-12">
			<Image
				src={asset("/images/auth-background.webp")}
				alt=""
				fill
				priority
				sizes="100vw"
				className="object-cover"
			/>

			{/* 桌機版釘在畫面右上角 —— 那裡是空的，也不必跟置中的 logo 搶同一列 */}
			<div className="absolute top-5 right-5 z-30 hidden sm:block">
				<LocaleSwitch current={locale} locales={locales} label={dict.nav.language} />
			</div>

			<div className="relative flex w-full max-w-sm flex-col items-center">
				{/* 品牌列：手機版 logo 靠左、返回靠右；桌機版 logo 置中，返回移到卡片下方 */}
				<div className="mb-6 flex w-full items-center justify-between sm:mb-8 sm:justify-center">
					<Link href={`/${locale}`} className="flex items-center gap-2.5">
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

					{/*
					 * 手機版把語系切換與返回併在品牌列右側。這一列在 375px 上很緊，
					 * 英文的 "Back to home" 又比中文長 —— 所以 380px 以下只留箭頭。
					 */}
					<div className="flex items-center gap-2.5 sm:hidden">
						<LocaleSwitch
							current={locale}
							locales={locales}
							label={dict.nav.language}
						/>
						<Link
							href={`/${locale}`}
							className="text-sm font-semibold whitespace-nowrap text-ink-400"
						>
							← <span className="max-[380px]:hidden">{backHome}</span>
						</Link>
					</div>
				</div>

				<div className="relative w-full">
					{/*
					 * 紫與粉紅。桌機在卡片下層只露出外緣，手機翻到上層並淡化 ——
					 * 手機版卡片左右各只剩 20px，留在下層等於整隻看不到（只能露 16%）。
					 */}
					<Image
						src={asset("/images/auth-monster-headphones.webp")}
						alt=""
						width={475}
						height={512}
						sizes="180px"
						className="pointer-events-none absolute top-24 -left-[12%] z-20 h-auto w-[30%] opacity-40 sm:left-auto sm:right-full sm:z-0 sm:w-[36.7%] sm:opacity-100"
					/>
					<Image
						src={asset("/images/auth-monster-antenna.webp")}
						alt=""
						width={483}
						height={512}
						sizes="180px"
						className="pointer-events-none absolute top-40 -right-[12%] z-20 h-auto w-[30%] opacity-40 sm:z-0 sm:-right-[23.6%] sm:w-[37.7%] sm:opacity-100"
					/>

					<div className="relative z-10 w-full rounded-2xl bg-surface p-7 shadow-[0_1px_2px_rgba(13,24,82,.05),0_10px_30px_rgba(13,24,82,.06)]">
						<h1 className="text-2xl font-extrabold">{title}</h1>
						<p className="mt-1.5 mb-6 text-sm text-ink-500">{subtitle}</p>
						{children}
					</div>

					{/*
					 * 青綠壓在卡片右下角上面。這隻用 bottom 而不是 top 定位 ——
					 * 註冊頁的卡片比登入頁高 240px，照 top 百分比擺會整隻滑進正文裡。
					 * 底部負值刻意小於 main 的 padding-bottom —— 垂直方向已經不裁了，超出去的話
					 * 會在頁面底部多撐出一段捲動。
					 */}
					<Image
						src={asset(`/images/auth-monster-${monster}.webp`)}
						alt=""
						width={487}
						height={512}
						sizes="220px"
						className="pointer-events-none absolute -right-[6%] -bottom-16 z-20 h-auto w-[42%] opacity-60 sm:-right-[24%] sm:-bottom-11 sm:w-[44.7%] sm:opacity-100"
					/>
				</div>

				{/* 桌機版：留在卡片下方。與品牌列那個互斥，同一時間只出現一個 */}
				<Link
					href={`/${locale}`}
					className="mt-8 hidden text-sm font-semibold text-ink-400 hover:text-primary-600 sm:block"
				>
					← {backHome}
				</Link>
			</div>
		</main>
	);
}
