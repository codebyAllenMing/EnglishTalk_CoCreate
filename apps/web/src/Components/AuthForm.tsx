"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
	fields: ReactNode;
	submitLabel: string;
	redirectTo: string;
	/** 有傳就檢查 password 與 confirmPassword 是否一致，訊息用這段文字 */
	mismatchMessage?: string;
};

/**
 * ⚠️⚠️ 假登入 ⚠️⚠️
 *
 * 後端尚未建立，這裡不呼叫任何 API —— 表單送出就直接轉頁。
 * 2026-08-21 決定先做頁面，API 之後再串。
 *
 * 接上真正的 auth 時，onSubmit 要換成呼叫認證 API，並依結果決定轉頁或顯示錯誤。
 * grep "FAKE_" 可找出專案所有假內容。
 *
 * 表單欄位由 Server Component 以 children 傳入，所以 AuthField 仍在伺服器端算好，
 * 只有這層 submit 處理是 client。
 */
export const FAKE_AUTH = true;

export default function AuthForm({ fields, submitLabel, redirectTo, mismatchMessage }: Props) {
	const router = useRouter();

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={(event) => {
				event.preventDefault();

				/*
				 * 兩次密碼一致性是唯一在前端做的檢查 —— 跨欄位比對沒辦法用 HTML5
				 * 的驗證屬性表達，而這個檢查本來就屬於前端（後端也會再擋一次，
				 * 但那是防竄改，不是使用者體驗）。其餘驗證等 API 接上再說。
				 */
				const form = event.currentTarget;
				const password = form.elements.namedItem("password");
				const confirm = form.elements.namedItem("confirmPassword");

				if (
					mismatchMessage &&
					password instanceof HTMLInputElement &&
					confirm instanceof HTMLInputElement
				) {
					// 先清掉上一次的錯誤，否則改對了也還是紅的
					confirm.setCustomValidity("");
					if (password.value !== confirm.value) {
						confirm.setCustomValidity(mismatchMessage);
						confirm.reportValidity();
						return;
					}
				}

				router.push(redirectTo);
			}}
		>
			{fields}

			<button
				type="submit"
				className="mt-2 w-full rounded-full bg-primary-500 py-3 font-extrabold text-white transition-colors hover:bg-primary-600"
			>
				{submitLabel}
			</button>
		</form>
	);
}
