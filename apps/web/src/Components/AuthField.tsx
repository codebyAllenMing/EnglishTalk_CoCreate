type Props = {
	id: string;
	label: string;
	type: "email" | "password" | "text";
	autoComplete: string;
	placeholder?: string;
	hint?: string;
};

/**
 * 登入 / 註冊表單的輸入欄位。
 *
 * focus 態同時改 border 與加 ring：只靠 ring 在高對比模式下會消失，
 * 只靠 border 則位移感太弱。兩者並用是為了鍵盤操作看得見焦點在哪。
 */
export default function AuthField({ id, label, type, autoComplete, placeholder, hint }: Props) {
	return (
		<div>
			<label htmlFor={id} className="mb-1.5 block text-xs font-extrabold text-ink-600">
				{label}
			</label>
			<input
				id={id}
				name={id}
				type={type}
				autoComplete={autoComplete}
				placeholder={placeholder}
				aria-describedby={hint ? `${id}-hint` : undefined}
				className="w-full rounded-xl border-2 border-ink-200 bg-surface px-3.5 py-2.5 placeholder:text-ink-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none"
			/>
			{hint && (
				<p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-400">
					{hint}
				</p>
			)}
		</div>
	);
}
