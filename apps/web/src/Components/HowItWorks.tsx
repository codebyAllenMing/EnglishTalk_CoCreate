import Image from "next/image";
import { getDictionary } from "@/dictionaries";

/**
 * 四步驟流程。
 *
 * 這裡的編號是真實的先後順序（必須依序完成），不是裝飾性的序號。
 *
 * 圓底是 CSS 畫的，不在圖裡 —— 出圖時特別要求不要畫圓底，這樣底色才調得動，
 * 也不必擔心四張圖的圓大小不一。圓 80px、圖 56px，圖不會頂到圓邊。
 * 底色各自呼應該圖示的主色。
 *
 * 外層容器交給 page.tsx —— 這一區在視覺稿裡與統計面板是左右兩欄，
 * 版面寬度由父層決定，這裡只管內容。
 */
export default async function HowItWorks() {
	const dict = await getDictionary();
	const { howItWorks } = dict;

	const steps = [
		{ ...howItWorks.step1, icon: "step-create-monster", tone: "bg-primary-50" },
		{ ...howItWorks.step2, icon: "step-set-time", tone: "bg-coral/10" },
		{ ...howItWorks.step3, icon: "step-find-room", tone: "bg-secondary-50" },
		{ ...howItWorks.step4, icon: "step-talk-grow", tone: "bg-primary-50" },
	];

	return (
		<div>
			<h2 className="mb-10 text-3xl font-extrabold">
				{howItWorks.title}
				<span aria-hidden="true" className="mt-2 block h-1 w-14 rounded-full bg-token" />
			</h2>

			<ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
				{steps.map((step, index) => (
					<li key={step.title} className="text-center">
						<span
							className={`mx-auto mb-4 flex size-24 items-center justify-center rounded-full sm:size-28 ${step.tone}`}
						>
							<Image
								src={`/images/${step.icon}.webp`}
								alt=""
								width={256}
								height={256}
								sizes="(max-width: 640px) 64px, 80px"
								className="size-16 sm:size-20"
							/>
						</span>
						<h3 className="mb-2 text-base font-extrabold">
							<span className="mr-1.5 text-ink-300 tabular-nums">{index + 1}</span>
							{step.title}
						</h3>
						<p className="text-sm leading-relaxed text-ink-500">{step.body}</p>
					</li>
				))}
			</ol>
		</div>
	);
}
