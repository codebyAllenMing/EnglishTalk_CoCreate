import Image from "next/image";
import { asset } from "@/asset";
import { getDictionary } from "@/dictionaries";

/**
 * 四項特色。
 *
 * 圖示是 3D 黏土風 WebP（非 SVG）—— 有體積光影的插圖轉 SVG 會爆量且失真，
 * 判準見 vault 的 landing-page-spec。四張的視覺重量已程式化拉齊
 * （墨量 = 平均色深 × 著墨像素），所以這裡不需要逐張微調尺寸。
 *
 * 顯示尺寸 80px 是從視覺稿換算的：稿上白卡寬 847px、圖示 56px，
 * 實際卡片 max-w-6xl = 1152px，比例 1.36 → 56 × 1.36 ≈ 76px。
 */
export default async function Features() {
	const dict = await getDictionary();
	const { features } = dict;

	const items = [
		{ ...features.availability, icon: "feature-availability" },
		{ ...features.groupChats, icon: "feature-group-chats" },
		{ ...features.reputation, icon: "feature-reputation" },
		{ ...features.together, icon: "feature-together" },
	];

	return (
		<section className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
			<div className="grid gap-6 rounded-3xl bg-surface p-8 shadow-[0_1px_2px_rgba(13,24,82,.05),0_10px_30px_rgba(13,24,82,.05)] sm:grid-cols-2 sm:gap-8 lg:grid-cols-4 lg:divide-x lg:divide-ink-100">
				{items.map((item) => (
					<div key={item.title} className="text-center lg:px-5">
						<Image
							src={asset(`/images/${item.icon}.webp`)}
							alt=""
							width={256}
							height={256}
							sizes="(max-width: 640px) 64px, 80px"
							className="mx-auto mb-4 size-16 sm:size-20"
						/>
						<h3 className="mb-2 text-base font-extrabold">{item.title}</h3>
						<p className="text-sm leading-relaxed text-ink-500">{item.body}</p>
					</div>
				))}
			</div>
		</section>
	);
}
