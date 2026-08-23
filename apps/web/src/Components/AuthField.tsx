import type { LucideIcon } from "lucide-react";
import { FIELD_HINT, FIELD_ICON, FIELD_INPUT, FIELD_LABEL } from "@/fieldStyles";

type Props = {
	id: string;
	label: string;
	type: "email" | "password" | "text";
	autoComplete: string;
	icon: LucideIcon;
	placeholder?: string;
	hint?: string;
};

/**
 * 登入 / 註冊表單的輸入欄位。
 *
 * focus 態同時改 border 與加 ring：只靠 ring 在高對比模式下會消失，
 * 只靠 border 則位移感太弱。兩者並用是為了鍵盤操作看得見焦點在哪。
 *
 * icon 寫在 input **之後**，視覺位置靠 absolute 拉回左邊 —— 這樣才能用
 * `peer-focus`（Tailwind 的 peer 必須是目標元素的前置兄弟），
 * 讓 icon 跟著 border 一起變成主色。icon 不可 focus，DOM 順序不影響 tab。
 *
 * 樣式與 PasswordField 共用 fieldStyles.ts —— 兩者在同一張表單裡上下相鄰，
 * 但隔著 client 邊界沒辦法共用元件，只能共用字串。密碼欄位請用 PasswordField。
 */
export default function AuthField({
	id,
	label,
	type,
	autoComplete,
	icon: Icon,
	placeholder,
	hint,
}: Props) {
	return (
		<div>
			<label htmlFor={id} className={FIELD_LABEL}>
				{label}
			</label>
			<div className="relative">
				<input
					id={id}
					name={id}
					type={type}
					autoComplete={autoComplete}
					placeholder={placeholder}
					aria-describedby={hint ? `${id}-hint` : undefined}
					className={`${FIELD_INPUT} pr-3.5`}
				/>
				<Icon
					aria-hidden="true"
					className={FIELD_ICON}
				/>
			</div>
			{hint && (
				<p id={`${id}-hint`} className={FIELD_HINT}>
					{hint}
				</p>
			)}
		</div>
	);
}
