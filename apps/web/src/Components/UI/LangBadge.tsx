type Props = {
	code: "zh" | "en";
	className?: string;
};

/**
 * 語言代碼的圓形徽章 —— 設計稿上出現 24 次，是全站重複最多的元件。
 *
 * ⚠️ 中文那顆的文字用 `danger` 而不是 `lang-zh`：`--color-lang-zh` 對比度只有
 *    2.95:1，不能當文字色（globals.css 的註解已載明）。底色仍用 lang-zh 的淡版，
 *    語意色因此保留，可讀性也守住。
 */
export default function LangBadge({ code, className = "size-6 text-[10px]" }: Props) {
	const tone = code === "zh" ? "bg-lang-zh/15 text-danger" : "bg-lang-en/15 text-lang-en";

	return (
		<span
			aria-hidden="true"
			className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold ${tone} ${className}`}
		>
			{code === "zh" ? "中" : "EN"}
		</span>
	);
}
