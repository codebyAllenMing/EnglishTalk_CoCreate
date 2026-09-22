"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import Dialog from "@/Components/UI/Dialog";
import type { Dictionary } from "@/dictionaries";
import { reportError } from "@/log";
import { useRoom } from "./RoomProvider";

type Props = { locale: string; dict: Dictionary["room"]; closeLabel: string; cancelLabel: string };

/** SPA 換頁在這麼久之後還在房間頁，就當它卡住了，改整頁跳轉 */
const NAVIGATE_FALLBACK_MS = 3000;

/**
 * 離開房間：先問（使用者 2026-09-21：「點擊離開會跳出警告」），確認才走。
 * 確認後回 /home —— 房間還開著時可以用房號再回來（那是後端的事）。
 *
 * 確認的那一下：先關對話框（畫面立刻有反應）、告訴 provider 要走了（beforeunload 不再攔）、`router.push`。
 * 手機經 tunnel 曾發生 push 之後畫面停住（2026-09-23，原因還沒抓到），所以 3 秒內還在房間頁就整頁跳轉，
 * 並留一筆 log 讓 api 那邊看得到。
 */
export default function LeaveRoomButton({ locale, dict, closeLabel, cancelLabel }: Props) {
	const router = useRouter();
	const { markLeaving } = useRoom();
	const home = `/${locale}/home`;

	const leave = (close: () => void) => {
		close();
		markLeaving();
		router.push(home);
		setTimeout(() => {
			if (!window.location.pathname.includes("/room/")) return;
			reportError("room.leave", "router.push 3 秒內沒換頁，改整頁跳轉", { href: window.location.href });
			// 這裡就是 router.push 失敗的備援，刻意整頁跳
			// eslint-disable-next-line @next/next/no-location-assign-relative-destination
			window.location.assign(home);
		}, NAVIGATE_FALLBACK_MS);
	};

	return (
		<Dialog
			trigger={
				<>
					<LogOut aria-hidden="true" className="size-4" />
					{dict.leave}
				</>
			}
			triggerClassName="flex items-center gap-2 rounded-xl border-2 border-danger-border/60 bg-surface px-4 py-2 text-sm font-extrabold text-danger transition-colors hover:border-danger-border hover:bg-lang-zh/10"
			title={dict.leaveTitle}
			description={dict.leaveHint}
			closeLabel={closeLabel}
			cancel={{ label: cancelLabel }}
			confirm={{ label: dict.leaveConfirm, onClick: leave }}
		>
			<span />
		</Dialog>
	);
}
