type Props = {
	count: number;
	label: string;
};

/**
 * 未讀數的紅色圓形 badge（選單的 Messages、頂部列的通知鈴鐺）。
 *
 * 數字本身對螢幕閱讀器沒有意義，label 補上「3 則未讀訊息」這樣的完整語意。
 * 超過 99 顯示 99+，否則兩位數以上會把圓形撐成橢圓。
 */
export default function CountBadge({ count, label }: Props) {
	if (count <= 0) return null;

	return (
		<span
			role="status"
			aria-label={`${count} ${label}`}
			className="inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 py-0.5 text-[11px] font-extrabold text-white"
		>
			{count > 99 ? "99+" : count}
		</span>
	);
}
