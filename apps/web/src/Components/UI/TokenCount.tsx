import { Coins } from "lucide-react";

type Props = {
	count: number;
	label: string;
	className?: string;
};

/**
 * 代幣數（頂部列的 pill、個人資料卡的數值列）。
 * 金幣用 token 色，數字用主色 —— 設計稿裡兩處都是這個組合。
 */
export default function TokenCount({ count, label, className = "" }: Props) {
	return (
		<span
			aria-label={`${count} ${label}`}
			className={`inline-flex items-center gap-1.5 font-extrabold text-primary-600 ${className}`}
		>
			<Coins aria-hidden="true" className="size-4 text-token" />
			{count}
		</span>
	);
}
