"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import { FIELD_HINT, FIELD_ICON, FIELD_INPUT, FIELD_LABEL } from "@/fieldStyles";

type Props = {
	id: string;
	label: string;
	autoComplete: string;
	/** 眼睛按鈕的 aria-label，兩種狀態各一 */
	showLabel: string;
	hideLabel: string;
	placeholder?: string;
	hint?: string;
};

/**
 * 密碼欄位 —— 與 AuthField 的差別只有右側那顆顯示 / 隱藏切換。
 *
 * 這是**唯一**需要 client 的欄位，所以獨立成一個元件而不是讓 AuthField 整個變成
 * Client Component：email 與 display name 留在 server，它們的 icon 就不會進
 * client bundle（lucide 在 Server Component 裡是建置期 render 成靜態 SVG 的）。
 *
 * ⚠️ 按鈕一定要 `type="button"`。<button> 在 <form> 裡的預設 type 是 submit，
 *    漏掉的話點眼睛會直接送出表單。
 *
 * 切換的是 input 的 type 而不是另外疊一個明碼欄位 —— 後者會讓密碼管理器
 * 看到兩個欄位而填錯，也會讓 AuthForm 的一致性檢查抓不到值。
 */
export default function PasswordField({
	id,
	label,
	autoComplete,
	showLabel,
	hideLabel,
	placeholder,
	hint,
}: Props) {
	const [visible, setVisible] = useState(false);
	const ToggleIcon = visible ? EyeOff : Eye;

	return (
		<div>
			<label htmlFor={id} className={FIELD_LABEL}>
				{label}
			</label>
			<div className="relative">
				<input
					id={id}
					name={id}
					type={visible ? "text" : "password"}
					autoComplete={autoComplete}
					placeholder={placeholder}
					aria-describedby={hint ? `${id}-hint` : undefined}
					className={`${FIELD_INPUT} pr-11`}
				/>
				<Lock aria-hidden="true" className={FIELD_ICON} />
				<button
					type="button"
					onClick={() => setVisible((shown) => !shown)}
					aria-label={visible ? hideLabel : showLabel}
					aria-pressed={visible}
					className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1.5 text-ink-300 transition-colors hover:text-primary-600"
				>
					<ToggleIcon aria-hidden="true" className="size-4" />
				</button>
			</div>
			{hint && (
				<p id={`${id}-hint`} className={FIELD_HINT}>
					{hint}
				</p>
			)}
		</div>
	);
}
