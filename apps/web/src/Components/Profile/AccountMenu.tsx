"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { signOut } from "@/auth/client";
import { useSession } from "@/auth/SessionProvider";

type Props = {
	locale: string;
	/** 頭像由 Server Component 傳進來，next/image 留在 server 端 render */
	avatar: ReactNode;
	label: string;
	logoutLabel: string;
};

/**
 * 頂部列的帳號選單：目前只有「登出」，上面帶目前登入者的名字與 email（來自 session）。
 *
 * 用 React state 而不是 Popover API：popover 在 top layer，定位不跟著頭像走，
 * 要靠 CSS anchor positioning 才對得準，而那個 Safari / Firefox 還沒齊。
 * 點外面與 Esc 關閉自己接。
 *
 * 登出後導去 landing（`/${locale}`）而不是 login —— 登出的人是要離開，不是要換帳號。
 * API 連不到時也照樣導走：留在原地也做不了別的事，cookie 會在 API 回來後的下一次登出清掉。
 */
export default function AccountMenu({ locale, avatar, label, logoutLabel }: Props) {
	const router = useRouter();
	const { user } = useSession();
	const [open, setOpen] = useState(false);
	const [leaving, setLeaving] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const menuId = useId();

	useEffect(() => {
		if (!open) return;
		const onPointerDown = (event: PointerEvent) => {
			if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setOpen(false);
		};
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [open]);

	return (
		<div ref={rootRef} className="relative">
			<button
				type="button"
				aria-label={label}
				aria-haspopup="menu"
				aria-expanded={open}
				aria-controls={menuId}
				onClick={() => setOpen((shown) => !shown)}
				className="flex items-center gap-1 text-ink-400 transition-colors hover:text-primary-600"
			>
				{avatar}
				<ChevronDown aria-hidden="true" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
			</button>

			{open && (
				<div
					id={menuId}
					role="menu"
					className="absolute top-full right-0 z-40 mt-2 w-56 rounded-2xl border border-ink-100 bg-surface p-2 shadow-lg"
				>
					{user && (
						<div className="border-b border-ink-100 px-3 pt-1.5 pb-2.5">
							<p className="truncate text-sm font-extrabold text-ink-600">{user.name}</p>
							<p className="truncate text-xs text-ink-400">{user.email}</p>
						</div>
					)}
					<button
						type="button"
						role="menuitem"
						disabled={leaving}
						onClick={async () => {
							setLeaving(true);
							await signOut().catch(() => undefined);
							router.replace(`/${locale}`);
						}}
						className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-ink-600 transition-colors hover:bg-primary-50/60 hover:text-primary-600 disabled:opacity-60"
					>
						<LogOut aria-hidden="true" className="size-4" />
						{logoutLabel}
					</button>
				</div>
			)}
		</div>
	);
}
