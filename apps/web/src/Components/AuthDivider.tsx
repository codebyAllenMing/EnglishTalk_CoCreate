import Link from "next/link";

type Props = {
	label: string;
	google: string;
	redirectTo: string;
};

/**
 * 「或」分隔線與 OAuth 按鈕。
 *
 * ⚠️ 假 OAuth —— provider 尚未接上，這顆按鈕只是直接轉頁，不做任何認證。
 *    語意上它應該是 button 而非連結，接上真正的 OAuth 時要換掉。
 */
export default function AuthDivider({ label, google, redirectTo }: Props) {
	return (
		<>
			<div className="my-5 flex items-center gap-3 text-xs font-bold text-ink-300">
				<span className="h-px flex-1 bg-ink-100" />
				{label}
				<span className="h-px flex-1 bg-ink-100" />
			</div>

			<Link
				href={redirectTo}
				className="block w-full rounded-full border-2 border-ink-200 py-3 text-center font-extrabold transition-colors hover:border-primary-400 hover:text-primary-600"
			>
				{google}
			</Link>
		</>
	);
}
