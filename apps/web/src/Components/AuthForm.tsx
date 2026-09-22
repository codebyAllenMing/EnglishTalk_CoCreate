"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { signIn, signUp, type AuthErrorCode } from "@/auth/client";
import { readNext, safeNext } from "@/auth/next";
import type { Dictionary } from "@/dictionaries";

type Props = {
	/** login 打 sign-in、signup 打 sign-up（多送 displayName） */
	mode: "login" | "signup";
	fields: ReactNode;
	submitLabel: string;
	locale: string;
	/** 成功後去哪；網址有 `?next=`（同站同語系）就以它為準 */
	redirectTo: string;
	/** 錯誤碼 → 文案，由 Server Component 從字典取好傳進來 */
	errors: Dictionary["form"]["errors"];
	/** 有傳就檢查 password 與 confirmPassword 是否一致，訊息用這段文字 */
	mismatchMessage?: string;
};

/**
 * 登入 / 註冊表單的送出層。
 *
 * 表單欄位由 Server Component 以 children 傳入，所以 AuthField 仍在伺服器端算好，
 * 只有這層 submit 處理是 client。欄位的值用 FormData 讀，不做受控輸入 ——
 * 密碼管理器自動填入時受控輸入常漏事件，而且這張表單沒有任何需要即時反應的欄位。
 *
 * 成功後轉頁；失敗把訊息放在按鈕上方。送出中鎖按鈕，避免連點打兩次 sign-up。
 */
export default function AuthForm({ mode, fields, submitLabel, locale, redirectTo, errors, mismatchMessage }: Props) {
	const router = useRouter();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<AuthErrorCode | null>(null);

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={async (event) => {
				event.preventDefault();
				const form = event.currentTarget;

				/*
				 * 兩次密碼一致性是唯一在前端做的跨欄位檢查 —— HTML5 的驗證屬性表達不了，
				 * 而它本來就屬於前端體驗（後端只看 password，不知道有第二欄）。
				 */
				const password = form.elements.namedItem("password");
				const confirm = form.elements.namedItem("confirmPassword");
				if (mismatchMessage && password instanceof HTMLInputElement && confirm instanceof HTMLInputElement) {
					// 先清掉上一次的錯誤，否則改對了也還是紅的
					confirm.setCustomValidity("");
					if (password.value !== confirm.value) {
						confirm.setCustomValidity(mismatchMessage);
						confirm.reportValidity();
						return;
					}
				}

				const data = new FormData(form);
				const email = String(data.get("email") ?? "").trim();
				const secret = String(data.get("password") ?? "");

				setPending(true);
				setError(null);
				const result =
					mode === "login"
						? await signIn(email, secret)
						: await signUp(String(data.get("displayName") ?? "").trim(), email, secret);

				if (result.ok) {
					// 不解鎖按鈕：轉頁前多按一次也不該再打一次 API
					router.push(safeNext(readNext(), locale, redirectTo));
					return;
				}
				setError(result.code);
				setPending(false);
			}}
		>
			{fields}

			{error && (
				<p role="alert" className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-bold text-danger">
					{errors[error]}
				</p>
			)}

			<button
				type="submit"
				disabled={pending}
				className="mt-2 w-full rounded-full bg-primary-500 py-3 font-extrabold text-white transition-colors hover:bg-primary-600 disabled:cursor-progress disabled:opacity-60"
			>
				{submitLabel}
			</button>
		</form>
	);
}
