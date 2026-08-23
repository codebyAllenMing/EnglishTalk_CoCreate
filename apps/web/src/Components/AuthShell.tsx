import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { asset } from "@/asset";
import { getLocale } from "@/dictionaries";

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
 *   紫    右緣貼卡片左緣，寬 36.7%，距卡片頂 164px    ← 卡片下層
 *   粉紅  右緣超出卡片 23.6%，寬 37.7%，距卡片頂 223px  ← 卡片下層
 *   青綠  右緣超出卡片 24.0%，寬 44.7%，底部超出 44px    ← 卡片上層，壓在卡片右下角
 *
 * 設計稿上紫與粉紅有一大半被卡片蓋住，只露出外緣 —— 那是刻意的，所以卡片給
 * `z-10`、這兩隻留在 `z-0`，青綠則是 `z-20` 壓上去。
 *
 * ⚠️ 垂直一律用 px（`top-41` = 164px、`top-56` = 224px）而不是百分比 ——
 *    註冊頁的卡片比登入頁高 240px，用百分比的話兩頁之間切換時怪獸會整個跳位，
 *    而使用者正是會在這兩頁來回的。卡片在 sm 以上寬度固定 384px，px 不會失準。
 *
 * 手機版只留青綠：另外兩隻在窄螢幕上會整隻被卡片蓋掉，載了也看不到。
 *
 * ## 兩個 RWD 決定
 *
 * **垂直置中只在 sm 以上做**（`sm:my-auto`）。手機版靠上排，因為登入頁內容只有約
 * 610px，在 700px 的視窗裡置中會在頂端留下 40 幾 px 的空白，看起來像沒對齊。
 *
 * ⚠️ 而且置中要用 `my-auto` 而不是 `justify-center` —— flex 容器的 justify-center
 *    在內容高於容器時會往**上下兩端**溢出，捲動只能往下，被推到負座標的上半部
 *    永遠捲不回來。註冊頁在 iPhone SE 上內容 686px、可用高度僅 553px，正好踩到。
 *
 * **返回首頁在手機版移到品牌列右側**，與 logo 同一列。不用 absolute 定位是因為
 * 在 320px 窄螢幕上，置中的 logo 右緣會與右上角的連結左緣重疊。
 */
export default async function AuthShell({ title, subtitle, backHome, monster, children }: Props) {
	const locale = await getLocale();

	return (
		// overflow-hidden 是必要的：怪獸刻意超出卡片，沒有它視窗會多出橫向捲軸
		<main className="relative flex min-h-dvh flex-col items-center overflow-hidden px-5 pt-10 pb-24 sm:py-12">
			<Image
				src={asset("/images/auth-background.webp")}
				alt=""
				fill
				priority
				sizes="100vw"
				className="object-cover"
			/>

			<div className="relative flex w-full max-w-sm flex-col items-center sm:my-auto">
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

					<Link
						href={`/${locale}`}
						className="text-sm font-semibold text-ink-400 sm:hidden"
					>
						← {backHome}
					</Link>
				</div>

				<div className="relative w-full">
					{/* 卡片下層的兩隻 —— 設計稿上大半被卡片蓋住，只露出外緣 */}
					<Image
						src={asset("/images/auth-monster-headphones.webp")}
						alt=""
						width={475}
						height={512}
						sizes="180px"
						className="pointer-events-none absolute top-41 right-full hidden h-auto w-[36.7%] sm:block"
					/>
					<Image
						src={asset("/images/auth-monster-antenna.webp")}
						alt=""
						width={483}
						height={512}
						sizes="180px"
						className="pointer-events-none absolute top-56 -right-[23.6%] hidden h-auto w-[37.7%] sm:block"
					/>

					<div className="relative z-10 w-full rounded-2xl bg-surface p-7 shadow-[0_1px_2px_rgba(13,24,82,.05),0_10px_30px_rgba(13,24,82,.06)]">
						<h1 className="text-2xl font-extrabold">{title}</h1>
						<p className="mt-1.5 mb-6 text-sm text-ink-500">{subtitle}</p>
						{children}
					</div>

					{/*
					 * 青綠壓在卡片右下角上面。這隻用 bottom 而不是 top 定位 ——
					 * 註冊頁的卡片比登入頁高 240px，照 top 百分比擺會整隻滑進正文裡。
					 * 底部負值刻意小於 main 的 padding-bottom，腳才不會被 overflow-hidden 切掉。
					 */}
					<Image
						src={asset(`/images/auth-monster-${monster}.webp`)}
						alt=""
						width={487}
						height={512}
						sizes="220px"
						className="pointer-events-none absolute -right-[6%] -bottom-16 z-20 h-auto w-[42%] sm:-right-[24%] sm:-bottom-11 sm:w-[44.7%]"
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
