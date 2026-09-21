"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type CSSProperties, type MouseEvent, type ReactNode } from "react";

type DialogAction = {
	/**
	 * 按鈕文字。**必填**，不是忘了給預設值 —— 專案有 i18n，而 Dialog 是 Client
	 * Component 拿不到字典（getDictionary 是 server-only）。在元件裡寫死
	 * 「確定」之類的 fallback，中文版遲早會冒出英文。
	 */
	label: string;
	/**
	 * ⚠️ 函式**無法**從 Server Component 傳進來（props 必須可序列化）。
	 * 要用這個欄位，呼叫端本身得是 Client Component，或改走 Server Action。
	 * 純展示用的對話框不給它就好，按鈕仍然會顯示。
	 */
	onClick?: (close: () => void) => void;
	disabled?: boolean;
};

type Props = {
	/**
	 * 觸發按鈕的內容。由 Server Component 渲染好傳進來，呼叫端不必變成 client。
	 * 受控模式（給了 open）可以不給 —— 開關由呼叫端決定，不需要按鈕。
	 */
	trigger?: ReactNode;
	/**
	 * 觸發按鈕的無障礙名稱。**只有圖示的觸發鈕必填** —— 例如個人資料卡右上角
	 * 那支筆，沒有它螢幕閱讀器只會唸到「按鈕」。有文字的 trigger 不用給。
	 */
	triggerLabel?: string;
	triggerClassName?: string;
	/** 給需要 inline style 的觸發元素用，例如週曆卡片的 grid 定位 */
	triggerStyle?: CSSProperties;
	title: string;
	description?: string;
	closeLabel: string;
	children: ReactNode;
	/**
	 * 次要動作。有給才顯示，不給就沒有這顆。點下去一定會關閉對話框，
	 * onClick 只是額外的副作用（例如清空草稿）。
	 */
	cancel?: DialogAction;
	/**
	 * 主要動作。有給才顯示。**不會自動關閉** —— onClick 收到一個 close 函式，
	 * 由呼叫端決定何時關：等 API 回來再關、驗證失敗就不關，都在上層決定。
	 */
	confirm?: DialogAction;
	/**
	 * 完全自訂的底部區塊。給了就取代 cancel / confirm ——
	 * 三顆按鈕、左側放說明之類的特例走這裡。
	 */
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
	/**
	 * 對話框關閉後呼叫。接的是原生的 close 事件，所以 **Esc、✕、點遮罩、
	 * 取消鈕四條路都會觸發** —— 表單要在關閉時還原草稿就靠它，不必在每顆按鈕上
	 * 各補一次（那樣一定會漏掉 Esc）。
	 */
	onClose?: () => void;
	/**
	 * 受控模式。給了就由呼叫端決定開關，trigger 不必給。
	 *
	 * 用在「一份清單、每列都能開同一個對話框」的場景（聊天訊息點了存單字）——
	 * 每列各掛一個 Dialog 會在 DOM 裡塞 N 份對話框，清單一長就是浪費；
	 * 改成清單只記「選中哪一列」，一個受控的 Dialog 跟著開關。
	 *
	 * ⚠️ 給 open 就要一起給 onClose 把 state 同步回來 —— Esc 與 ✕ 會直接關掉原生
	 *    <dialog>，上層不知道的話，state 還是 true、下次就開不起來。
	 */
	open?: boolean;
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
	triggerLabel,
	triggerClassName,
	triggerStyle,
	title,
	description,
	closeLabel,
	children,
	cancel,
	confirm,
	footer,
	closeOnBackdrop = true,
	onClose,
	open,
	className = "max-w-md",
}: Props) {
	const ref = useRef<HTMLDialogElement>(null);
	/**
	 * ⚠️ 標題的 id 必須每個實例不同。同一頁上的 Dialog 不只一個
	 * （週曆每張卡片一個、個人資料卡在桌機與手機版型各一個），寫死同一個 id
	 * 會讓 aria-labelledby 一律指到 DOM 裡的第一個 —— 每個對話框都被唸成
	 * 同一個標題，而且 HTML 也不合法。
	 */
	const titleId = useId();

	const close = () => ref.current?.close();

	// 受控模式：state 變了才碰原生 API，已經是目標狀態就不重複呼叫
	// （對已開的 dialog 再 showModal() 會丟 InvalidStateError）
	useEffect(() => {
		const el = ref.current;
		if (open === undefined || !el) return;
		if (open && !el.open) el.showModal();
		else if (!open && el.open) el.close();
	}, [open]);

	const closeIfBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
		if (!closeOnBackdrop) return;
		if (event.target === ref.current) close();
	};

	return (
		<>
			{trigger !== undefined && (
				<button
					type="button"
					aria-label={triggerLabel}
					className={triggerClassName}
					style={triggerStyle}
					onClick={() => ref.current?.showModal()}
				>
					{trigger}
				</button>
			)}

			<dialog
				ref={ref}
				onClick={closeIfBackdrop}
				onClose={onClose}
				aria-labelledby={titleId}
				className={`m-auto w-[calc(100%-2rem)] bg-transparent p-4 opacity-0 backdrop:bg-ink/40 backdrop:opacity-0 backdrop:backdrop-blur-[2px] backdrop:transition-opacity backdrop:duration-200 transition-all transition-discrete duration-200 open:opacity-100 open:backdrop:opacity-100 starting:open:opacity-0 starting:open:backdrop:opacity-0 ${className}`}
			>
				<div className="flex max-h-[85dvh] flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_2px_rgba(13,24,82,.06),0_24px_60px_rgba(13,24,82,.18)]">
					<header className="flex items-start gap-4 px-6 pt-5 pb-4">
						<div className="min-w-0 flex-1">
							<h2 id={titleId} className="text-lg font-extrabold">
								{title}
							</h2>
							{description && (
								<p className="mt-1 text-sm text-ink-500">{description}</p>
							)}
						</div>
						<button
							type="button"
							aria-label={closeLabel}
							onClick={close}
							className="shrink-0 rounded-full bg-app p-2.5 text-ink transition-colors hover:bg-primary-100 hover:text-primary-600"
						>
							<X aria-hidden="true" className="size-4" />
						</button>
					</header>

					<div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5">{children}</div>

					{/* 設計稿的底部是兩顆等寬按鈕、沒有分隔線（見 個人主頁-編輯.png）。
					    只給一顆時它會自己佔滿整列，那也是對的 */}
					{(footer || cancel || confirm) && (
						<footer className="flex items-center gap-3 px-6 pt-3 pb-6">
							{footer ?? (
								<>
									{cancel && (
										<button
											type="button"
											disabled={cancel.disabled}
											onClick={() => {
												cancel.onClick?.(close);
												close();
											}}
											className="flex-1 rounded-xl bg-primary-50 px-5 py-3 text-sm font-extrabold text-primary-600 transition-colors hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
										>
											{cancel.label}
										</button>
									)}
									{confirm && (
										<button
											type="button"
											disabled={confirm.disabled}
											onClick={() => confirm.onClick?.(close)}
											className="flex-1 rounded-xl bg-primary-500 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
										>
											{confirm.label}
										</button>
									)}
								</>
							)}
						</footer>
					)}
				</div>
			</dialog>
		</>
	);
}
