"use client";

import {
	Bell,
	CalendarPlus,
	CalendarX,
	Clock,
	Flag,
	Hand,
	Sparkles,
	UserCheck,
	UserMinus,
	UserPlus,
	UserX,
	type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import CountBadge from "@/Components/UI/CountBadge";
import type { Dictionary } from "@/dictionaries";
import { getNotifications, markNotificationsRead, type NotificationList, type NotificationType } from "@/notifications/client";
import { usePresence } from "@/presence/PresenceProvider";

type Props = {
	locale: string;
	dict: Dictionary["profile"]["notifications"];
};

/** 每種通知一個圖示；文案本身是 server 組好的，前端只挑圖 */
const ICONS: Record<NotificationType, LucideIcon> = {
	roomCreated: CalendarPlus,
	roomStarting: Clock,
	joinRequested: UserPlus,
	joinApproved: UserCheck,
	joinRejected: UserX,
	roomCancelled: CalendarX,
	memberLeft: UserMinus,
	roomEnded: Flag,
	greeting: Hand,
	welcome: Sparkles,
};

/**
 * 頂部列的鈴鐺（使用者 2026-09-23 定案：通知只是訊息，點了不跳頁）。
 *
 * - 徽章數來自 PresenceProvider：心跳每 60 秒回一次 `{ unread }`，不另開輪詢。
 * - 打開 = 已讀：拉清單、把拿到的那一刻誰未讀畫粗體，然後整批標已讀、徽章歸零。
 *   清單是那一刻的快照，粗體在這次打開期間保留，關掉再開就都是普通字了。
 * - 下拉跟 AccountMenu 同一套：React state、點外面與 Esc 關閉，不用 Popover API（定位對不準）。
 * - 每一則不能點，所以整個下拉 `cursor-default`、沒有 hover 底色（使用者 2026-09-23：滑過去不要變成文字游標）。
 */
export default function NotificationBell({ locale, dict }: Props) {
	const { unread, setUnread } = usePresence();
	const [open, setOpen] = useState(false);
	const [list, setList] = useState<NotificationList | null>(null);
	const [state, setState] = useState<"idle" | "loading" | "failed">("idle");
	// 相對時間的基準：打開那一刻（render 裡不讀 Date.now()）
	const [now, setNow] = useState(0);
	const rootRef = useRef<HTMLDivElement>(null);
	const panelId = useId();

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

	const toggle = async () => {
		if (open) {
			setOpen(false);
			return;
		}
		setOpen(true);
		setNow(Date.now());
		setState("loading");
		const result = await getNotifications();
		if (!result) {
			setState("failed");
			return;
		}
		setList(result);
		setState("idle");
		// 打開就算讀過了；徽章先歸零，API 失敗下一次心跳會把數字補回來
		if (result.unread > 0 || unread > 0) {
			setUnread(0);
			void markNotificationsRead();
		}
	};

	return (
		<div ref={rootRef} className="relative">
			<button
				type="button"
				aria-label={dict.title}
				aria-expanded={open}
				aria-controls={panelId}
				onClick={() => void toggle()}
				className={`relative rounded-full p-1.5 transition-colors hover:text-primary-600 ${open ? "text-primary-600" : "text-ink-600"}`}
			>
				<Bell aria-hidden="true" className="size-5" />
				{/* badge 疊在鈴鐺右上角，超出按鈕範圍是刻意的 */}
				<span className="absolute -top-0.5 -right-1">
					<CountBadge count={unread} label={dict.title} />
				</span>
			</button>

			{open && (
				<div
					id={panelId}
					role="region"
					aria-label={dict.title}
					className="absolute top-full right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] cursor-default rounded-2xl border border-ink-100 bg-surface shadow-lg"
				>
					<p className="border-b border-ink-100 px-4 py-3 text-sm font-extrabold">{dict.title}</p>
					<div className="max-h-96 overflow-y-auto p-2">
						{state === "failed" ? (
							<p className="px-2 py-6 text-center text-sm text-ink-400">{dict.failed}</p>
						) : state === "loading" && !list ? (
							<p className="px-2 py-6 text-center text-sm text-ink-400">…</p>
						) : !list || list.items.length === 0 ? (
							<p className="px-2 py-6 text-center text-sm text-ink-400">{dict.empty}</p>
						) : (
							<ul className="flex flex-col">
								{list.items.map((item) => {
									const Icon = ICONS[item.type] ?? Bell;
									return (
										<li key={item.id} className="flex items-start gap-3 px-2 py-2.5">
											<span
												className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
													item.isRead ? "bg-ink-50 text-ink-400" : "bg-primary-50 text-primary-600"
												}`}
											>
												<Icon aria-hidden="true" className="size-4" />
											</span>
											<span className="min-w-0 flex-1">
												<span className={`block text-sm leading-snug ${item.isRead ? "text-ink-600" : "font-bold text-ink"}`}>
													{item.text}
												</span>
												<span className="mt-0.5 block text-xs text-ink-400">{timeAgo(item.createDate, now, locale, dict.justNow)}</span>
											</span>
											{!item.isRead && <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-danger" />}
										</li>
									);
								})}
							</ul>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

/** 「5 分鐘前」「3 小時前」「昨天」；一週以上就顯示日期 */
function timeAgo(iso: string, now: number, locale: string, justNow: string): string {
	const diff = now - new Date(iso).getTime();
	if (diff < 60_000) return justNow;
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
	const minutes = Math.round(diff / 60_000);
	if (minutes < 60) return rtf.format(-minutes, "minute");
	const hours = Math.round(minutes / 60);
	if (hours < 24) return rtf.format(-hours, "hour");
	const days = Math.round(hours / 24);
	if (days < 7) return rtf.format(-days, "day");
	return new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" }).format(new Date(iso));
}
