import Image from "next/image";
import { getDictionary } from "@/dictionaries";

/**
 * 使用者評價。
 *
 * ⚠️⚠️ 這三則評價與人物全部是虛構的 ⚠️⚠️
 *
 * 來自視覺稿的 placeholder。2026-08-20 決定「先用假數據」，與統計面板同一個決定。
 * 上線前必須換成真實評價或整區移除 —— 具名的假推薦語比假數字更接近不實廣告。
 * grep "FAKE_" 可找出本專案所有待處理的假內容。
 *
 * 視覺稿底部有四個輪播指示點，這裡刻意不做 —— 我們沒有輪播功能，
 * 放上去等於一個點了沒反應的假控制項，與「不存在的頁面不給連結」是同一個原則。
 */
const FAKE_TESTIMONIALS = [
	{ key: "sophie", avatar: "avatar-sophie", flag: "🇹🇼", tone: "bg-coral/15" },
	{ key: "lucas", avatar: "avatar-lucas", flag: "🇧🇷", tone: "bg-secondary-100" },
	{ key: "minji", avatar: "avatar-minji", flag: "🇰🇷", tone: "bg-primary-100" },
] as const;

const STAR_COUNT = 5;

export default async function Testimonials() {
	const dict = await getDictionary();
	const { testimonials } = dict;

	return (
		<section className="mx-auto max-w-6xl px-5 pb-6 sm:px-8">
			<h2 className="mb-8 flex items-center gap-2.5 text-3xl font-extrabold">
				{testimonials.title}
				<span aria-hidden="true" className="text-2xl text-lang-zh">
					♡
				</span>
			</h2>

			<ul className="grid gap-6 md:grid-cols-3">
				{FAKE_TESTIMONIALS.map((person) => {
					const { name, country, quote } = testimonials[person.key];
					return (
						<li
							key={person.key}
							className="rounded-2xl bg-surface p-6 shadow-[0_1px_2px_rgba(13,24,82,.05),0_10px_30px_rgba(13,24,82,.05)]"
						>
							<div className="mb-4 flex items-center gap-3">
								<span
									className={`flex size-14 shrink-0 items-center justify-center rounded-full ${person.tone}`}
								>
									<Image
										src={`/images/${person.avatar}.webp`}
										alt=""
										width={256}
										height={256}
										sizes="48px"
										className="size-12"
									/>
								</span>
								<div className="min-w-0">
									<p className="font-extrabold">{name}</p>
									<p className="text-sm text-ink-400">
										{country} <span aria-hidden="true">{person.flag}</span>
									</p>
								</div>
								{/* 評分是圖形不是文字，用 aria-label 一次講完，不要讓螢幕閱讀器念五次星星 */}
								<p
									aria-label={`${STAR_COUNT} / ${STAR_COUNT}`}
									className="ml-auto shrink-0 text-sm text-token"
								>
									{"★".repeat(STAR_COUNT)}
								</p>
							</div>
							<blockquote className="text-sm leading-relaxed text-ink-500">
								{quote}
							</blockquote>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
