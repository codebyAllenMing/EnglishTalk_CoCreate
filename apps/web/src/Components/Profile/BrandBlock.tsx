import Image from "next/image";
import { asset } from "@/asset";
import { getDictionary } from "@/dictionaries";

/**
 * 側邊欄頂端的品牌區。
 *
 * ⚠️ 設計稿這裡是「ME / Mandarin × English」，但 Nav 與登入頁都已經是 MonsterTalk。
 *    兩套識別不能同時存在，暫時統一成 MonsterTalk，保留設計稿的副標與 slogan 結構。
 *    使用者 2026-08-27 表示品牌名還要再想，定案後只需要改這裡。
 *
 * compact 給手機版頂部那一排用：只留 logo 與名字，藏起 tagline 與 slogan。
 * 那一排還要放語言切換、通知與頭像，375px 上完整版會直接擠爆。
 *
 * slogan 存成陣列而不是一整句：設計稿把其中兩個詞另外上色（紫與青綠），
 * 而中文與英文的強調位置不同，切成段落才能兩種語言共用同一個渲染邏輯。
 * 奇數 index 是強調，偶數是一般文字。
 */
export default async function BrandBlock({ compact }: { compact?: boolean }) {
	const dict = await getDictionary();
	const { brand } = dict.profile;
	const accents = ["text-primary-500", "text-secondary-500"];

	return (
		<div className={compact ? "" : "px-2"}>
			<div className="flex items-center gap-2.5">
				<Image
					src={asset("/images/monster-64.png")}
					alt=""
					width={40}
					height={40}
					className="size-10"
					priority
				/>
				<div className="leading-tight">
					<p className="text-lg font-extrabold tracking-tight lg:text-xl">MonsterTalk</p>
					{!compact && <p className="text-xs font-bold text-ink-500">{brand.tagline}</p>}
				</div>
			</div>

			{!compact && (
			<p className="mt-3 text-sm font-extrabold">
				{brand.slogan.map((part, i) => (
					<span key={i} className={i % 2 ? accents[(i - 1) / 2] : undefined}>
						{part}
					</span>
				))}
			</p>
			)}
		</div>
	);
}
