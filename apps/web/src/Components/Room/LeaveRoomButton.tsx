"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import Dialog from "@/Components/UI/Dialog";
import type { Dictionary } from "@/dictionaries";

type Props = { locale: string; dict: Dictionary["room"]; closeLabel: string; cancelLabel: string };

/**
 * 離開房間：先問（使用者 2026-09-21：「點擊離開會跳出警告」），確認才走。
 * 確認後回 /home —— 房間還開著時可以用房號再回來（那是後端的事）。
 */
export default function LeaveRoomButton({ locale, dict, closeLabel, cancelLabel }: Props) {
	const router = useRouter();
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
			confirm={{ label: dict.leaveConfirm, onClick: () => router.push(`/${locale}/home`) }}
		>
			<span />
		</Dialog>
	);
}
