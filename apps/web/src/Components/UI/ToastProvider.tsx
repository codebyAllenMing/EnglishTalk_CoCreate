"use client";

import { Check } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Toast = { id: number; message: string };

type ToastContextValue = {
	/** 顯示一則短訊息（底部置中的 snackbar），三秒後自己消失 */
	toast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue>({ toast: () => undefined });

export function useToast(): ToastContextValue {
	return useContext(ToastContext);
}

const TOAST_MS = 3000;

/**
 * Snackbar。掛在 (app)/layout.tsx —— layout 在 client 導頁時不會重掛，
 * 所以「設定頁按儲存 → toast → 回 home」這種跨頁的提示才留得住。
 *
 * 位置固定在底部置中：手機版底部有 TabBar（h-16 左右），要墊高避開；桌機沒有。
 * 一次只顯示最新一則就夠了（目前只有「已儲存」一種用途），新的來就把舊的換掉。
 */
export default function ToastProvider({ children }: { children: ReactNode }) {
	const [current, setCurrent] = useState<Toast | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const toast = useCallback((message: string) => {
		if (timer.current) clearTimeout(timer.current);
		const id = Date.now();
		setCurrent({ id, message });
		timer.current = setTimeout(() => setCurrent((t) => (t?.id === id ? null : t)), TOAST_MS);
	}, []);

	return (
		<ToastContext value={{ toast }}>
			{children}
			{/* aria-live 讓螢幕閱讀器唸出來；容器常駐、內容才換，live region 才會被注意到 */}
			<div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 lg:bottom-6">
				{current && (
					<div
						key={current.id}
						role="status"
						className="flex items-center gap-2 rounded-full bg-ink-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-[opacity,translate] duration-300 starting:translate-y-2 starting:opacity-0"
					>
						<Check aria-hidden="true" className="size-4 text-secondary-400" strokeWidth={3} />
						{current.message}
					</div>
				)}
			</div>
		</ToastContext>
	);
}
