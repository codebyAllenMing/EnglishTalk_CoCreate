"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Dialog from "@/Components/UI/Dialog";
import { fill } from "@/Components/Profile/Monsters/monstersData";
import type { Dictionary } from "@/dictionaries";

type Props = { dict: Dictionary["room"]; closeLabel: string; confirmLabel: string };

/**
 * 從結束的房間被送回首頁時彈的「XXX 房間的對話已結束」。
 * 房號在 ?ended= 裡 —— 靜態站沒有 server session 可以放「你剛從哪個房間出來」，
 * URL 是唯一能跨頁帶狀態的地方。關掉時把 query 清掉，重整就不會再彈。
 *
 * ⚠️ useSearchParams 在靜態預渲染的頁面必須包在 Suspense 裡，不然 build 會擋。
 */
export default function RoomEndedNotice(props: Props) {
	return (
		<Suspense>
			<Notice {...props} />
		</Suspense>
	);
}

function Notice({ dict, closeLabel, confirmLabel }: Props) {
	const code = useSearchParams().get("ended");
	const router = useRouter();
	const pathname = usePathname();
	const [open, setOpen] = useState(code !== null);
	if (code === null) return null;

	const dismiss = () => {
		setOpen(false);
		router.replace(pathname);
	};

	return (
		<Dialog
			open={open}
			onClose={dismiss}
			title={fill(dict.endedTitle, { code })}
			description={dict.endedHint}
			closeLabel={closeLabel}
			confirm={{ label: confirmLabel, onClick: (close) => close() }}
			className="max-w-sm"
		>
			<span />
		</Dialog>
	);
}
