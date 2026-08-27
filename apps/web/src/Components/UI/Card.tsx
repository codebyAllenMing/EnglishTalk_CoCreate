import type { ReactNode } from "react";

type Props = {
	children: ReactNode;
	className?: string;
};

/**
 * 白底圓角卡片 —— 個人資料卡、週曆、Find Monsters、詳情面板、主區區塊都用它。
 *
 * 抽出來不是為了少打字，而是這五塊會同時出現在同一個畫面上，
 * 圓角或陰影差一點點就會看得出來不是同一套系統。
 */
export default function Card({ children, className = "" }: Props) {
	return (
		<section
			className={`rounded-2xl bg-surface shadow-[0_1px_2px_rgba(13,24,82,.04),0_8px_24px_rgba(13,24,82,.05)] ${className}`}
		>
			{children}
		</section>
	);
}
