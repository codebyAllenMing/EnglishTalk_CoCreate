"use client";

import { X } from "lucide-react";
import { useRef, type MouseEvent, type ReactNode } from "react";

type Props = {
	/** 觸發按鈕的內容。由 Server Component 渲染好傳進來，呼叫端不必變成 client */
	trigger: ReactNode;
	triggerClassName?: string;
	title: string;
	description?: string;
	closeLabel: string;
	children: ReactNode;
	/** 底部按鈕列，通常是取消 / 確認 */
	footer?: ReactNode;
	/**
	 * 點遮罩是否關閉，預設 true。填到一半的表單、或必須做出選擇的確認，
	 * 傳 false 免得誤觸丟掉輸入。
	 *
	 * ⚠️ 就算傳 false，**Esc 仍然關得掉** —— 那是原生 <dialog> 的行為，也是刻意保留：
	 *    modal 一定要有鍵盤逃生路徑，不然鍵盤使用者會被困住。真要連 Esc 都擋
	 *    （例如不可中斷的流程），得另外在 onCancel 裡 preventDefault。
	 */
	closeOnBackdrop?: boolean;
	className?: string;
};

/**
 * 共用對話框，用原生 <dialog> 而不是自己疊 div 或裝 Radix。
 *
 * `showModal()` 內建了自己刻很難做對的那幾件事：焦點鎖在對話框內、背景變成 inert
 * 讓螢幕閱讀器讀不到、Esc 關閉、以及 `::backdrop` 這個真正的遮罩層。
 * 零相依就有 a11y，跟這個專案的取捨一致。
 *
 * ## 為什麼把 trigger 當 prop 收進來
 *
 * 開關需要 JS，所以這個元件必然是 client。但呼叫端（ScheduleSection 之類）
 * 是 Server Component —— 讓它把按鈕內容當 element 傳進來，就不必為了一個
 * onClick 把整個區塊拖進 client bundle。
 *
 * ## 兩件原生 <dialog> 沒有的
 *
 * 1. **點遮罩關閉**：`::backdrop` 不是子元素，點擊事件的 target 會是 <dialog> 本身。
 *    所以 padding 留在 <dialog> 上、內容另外包一層，target 是 dialog 就代表
 *    點在內容外面。用 `closeOnBackdrop={false}` 可以關掉這個行為。
 * 2. **進出場動畫**：display 從 none 變 block 無法過渡，要靠 transition-discrete
 *    加上 starting: 起始樣式。
 */
export default function Dialog({
	trigger,
	triggerClassName,
	title,
	description,
	closeLabel,
	children,
	footer,
	closeOnBackdrop = true,
	className = "max-w-md",
}: Props) {
	const ref = useRef<HTMLDialogElement>(null);

	const closeIfBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
		if (!closeOnBackdrop) return;
		if (event.target === ref.current) ref.current?.close();
	};

	return (
		<>
			<button type="button" className={triggerClassName} onClick={() => ref.current?.showModal()}>
				{trigger}
			</button>

			<dialog
				ref={ref}
				onClick={closeIfBackdrop}
				aria-labelledby="dialog-title"
				className={`m-auto w-[calc(100%-2rem)] bg-transparent p-4 opacity-0 backdrop:bg-ink/40 backdrop:opacity-0 backdrop:backdrop-blur-[2px] backdrop:transition-opacity backdrop:duration-200 transition-all transition-discrete duration-200 open:opacity-100 open:backdrop:opacity-100 starting:open:opacity-0 starting:open:backdrop:opacity-0 ${className}`}
			>
				<div className="flex max-h-[85dvh] flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_2px_rgba(13,24,82,.06),0_24px_60px_rgba(13,24,82,.18)]">
					<header className="flex items-start gap-4 px-6 pt-5 pb-4">
						<div className="min-w-0 flex-1">
							<h2 id="dialog-title" className="text-lg font-extrabold">
								{title}
							</h2>
							{description && (
								<p className="mt-1 text-sm text-ink-500">{description}</p>
							)}
						</div>
						<button
							type="button"
							aria-label={closeLabel}
							onClick={() => ref.current?.close()}
							className="-mt-1 -mr-2 shrink-0 rounded-full p-2 text-ink-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
						>
							<X aria-hidden="true" className="size-4" />
						</button>
					</header>

					<div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">{children}</div>

					{footer && (
						<footer className="flex items-center justify-end gap-2 border-t border-ink-100 px-6 py-4">
							{footer}
						</footer>
					)}
				</div>
			</dialog>
		</>
	);
}
