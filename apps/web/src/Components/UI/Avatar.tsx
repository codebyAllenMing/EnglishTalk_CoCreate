import Image from "next/image";
import { asset } from "@/asset";

type Props = {
	/** public/images 下的檔名，不含副檔名，例如 avatar-allen */
	src: string;
	/** 寬度用 Tailwind class 傳，圓底與線上點都跟著等比縮放 */
	className: string;
	sizes: string;
	online?: boolean;
	onlineLabel?: string;
	priority?: boolean;
};

/**
 * 怪獸頭像 —— 設計稿上出現 13 次（個人資料卡、10 張怪獸卡、詳情面板、頂部列）。
 *
 * ⚠️ 圓形底色**不是裁切遮罩，是墊在後面的色塊**。設計稿裡怪獸的身體兩側刻意
 *    超出圓形，用 overflow-hidden 的圓框會把耳朵、角、揮手的手全部切掉。
 *    所以圓是一個 absolute 的背景，圖疊在上面，容器不設 overflow。
 *
 * 圓與線上點的位置全用百分比，同一個元件才能從 40px 的頂部列一路用到 128px 的
 * 個人資料卡；改成 px 就得為每個尺寸各寫一組。
 */
export default function Avatar({
	src,
	className,
	sizes,
	online,
	onlineLabel,
	priority,
}: Props) {
	return (
		<div className={`relative shrink-0 ${className}`}>
			<div className="absolute inset-x-[6%] top-[4%] aspect-square rounded-full bg-primary-100" />
			<Image
				src={asset(`/images/${src}.webp`)}
				alt=""
				width={320}
				height={320}
				sizes={sizes}
				className="relative h-auto w-full"
				priority={priority}
			/>
			{online && (
				<span
					title={onlineLabel}
					className="absolute right-[8%] bottom-[10%] size-[13%] min-h-2.5 min-w-2.5 rounded-full border-2 border-surface bg-secondary-400"
				/>
			)}
		</div>
	);
}
