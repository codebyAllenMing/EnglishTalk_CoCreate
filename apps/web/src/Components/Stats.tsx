import Image from "next/image";
import { getDictionary } from "@/dictionaries";

/**
 * 統計面板。
 *
 * ⚠️⚠️ 這一區的數字全部是假的 ⚠️⚠️
 *
 * 來自視覺稿的 placeholder，不是真實統計，也沒有串接任何資料來源。
 * 2026-08-20 決定「先用假數據，不做真實串接」—— 上線前必須換成真實數字或整區移除。
 *
 * 常數刻意命名為 FAKE_STATS 而不是 STATS：假數據最大的風險不是「假」，
 * 是上線前忘了換。grep "FAKE_" 就找得到本專案所有待換掉的假內容。
 */
const FAKE_STATS = [
	{
		key: "learners",
		value: "12K+",
		icon: "stat-learners",
		tone: "bg-token/15 ring-token/30",
	},
	{
		key: "conversations",
		value: "30K+",
		icon: "stat-conversations",
		tone: "bg-primary-50 ring-primary-200",
	},
	{
		key: "countries",
		value: "70+",
		icon: "stat-countries",
		tone: "bg-secondary-50 ring-secondary-200",
	},
	{
		key: "rating",
		value: "4.9",
		icon: "stat-rating",
		tone: "bg-token/15 ring-token/30",
	},
] as const;

export default async function Stats() {
	const dict = await getDictionary();
	const { stats } = dict;

	return (
		<aside className="relative rounded-3xl bg-secondary-50 p-7 sm:p-8">
			<ul className="flex flex-col gap-7">
				{FAKE_STATS.map((stat) => (
					<li key={stat.key} className="flex items-center gap-4">
						{/* 圓底外圈那道環是視覺稿就有的，用 ring 畫，顏色跟著圖示走 */}
						<span
							className={`flex size-20 shrink-0 items-center justify-center rounded-full ring-4 ${stat.tone}`}
						>
							<Image
								src={`/images/${stat.icon}.webp`}
								alt=""
								width={256}
								height={256}
								sizes="56px"
								className="size-14"
							/>
						</span>
						{/*
						 * 最後一項要讓出右下角給怪獸 —— 視覺稿裡這行文字是換成兩行的，
						 * 面板加寬後反而不會自然換行，所以明確留出右側空間。
						 */}
						<div className={stat.key === "rating" ? "pr-24" : undefined}>
							<p className="text-2xl font-extrabold tabular-nums">
								{stat.value}
								{/* 評分後面跟一顆星，其餘三項沒有 */}
								{stat.key === "rating" && (
									<span aria-hidden="true" className="ml-1.5 text-token">
										★
									</span>
								)}
							</p>
							<p className="text-sm leading-snug text-ink-500">{stats[stat.key]}</p>
						</div>
					</li>
				))}
			</ul>

			{/*
			 * 揮手的粉紅怪獸與牠的對話泡泡。
			 *
			 * 視覺稿量測：怪獸寬約面板的 36%，右緣與面板切齊，**66% 的身體露在面板下緣以外**。
			 * 是從底下探出來，不是從右邊 —— 這是它不會擋到文字的原因。
			 * lg 以下收起來，窄螢幕沒有可溢出的空間。
			 */}
			<div className="pointer-events-none absolute -right-1 -bottom-16 hidden w-36 lg:block">
				<div className="relative mb-1 -ml-10 rounded-2xl bg-surface px-3 py-2 shadow-[0_2px_10px_rgba(13,24,82,.08)]">
					{/* 換行點寫在文案裡（\n），各語言自己決定要斷在哪 */}
						<p className="text-center text-xs leading-snug font-bold whitespace-pre-line text-ink">
						{stats.monsterQuip}
					</p>
					{/* 泡泡尾巴：旋轉 45° 的小方塊，從底緣探出指向怪獸 */}
					<span
						aria-hidden="true"
						className="absolute right-9 -bottom-1 size-3 rotate-45 rounded-[2px] bg-surface"
					/>
				</div>
				<Image
					src="/images/monster-peek.webp"
					alt=""
					width={256}
					height={256}
					sizes="144px"
					className="w-full"
				/>
			</div>
		</aside>
	);
}
