"use client";

import { Clock, KeyRound, Users } from "lucide-react";
import type { ReactNode } from "react";
import { fill } from "@/Components/Profile/Monsters/monstersData";
import type { Dictionary } from "@/dictionaries";
import { parseLocalDateTime } from "./roomData";
import { useRoom } from "./RoomProvider";

type Props = {
	locale: string;
	dict: Pick<Dictionary["room"], "kind" | "roomCode" | "people" | "total">;
	lang: Dictionary["profile"]["lang"];
};

/**
 * 房間標題與三顆 chip。房間資料在 client 才拿得到（RoomGate 打 API），
 * 所以從 RoomShell（server）拆出來讀 useRoom()；字典由 server 以 props 餵。
 */
export default function RoomHeading({ locale, dict, lang }: Props) {
	const { room } = useRoom();
	const when = new Intl.DateTimeFormat(locale, { weekday: "long", hour: "numeric", minute: "2-digit" }).format(
		parseLocalDateTime(room.startsAt),
	);

	return (
		<div className="order-last w-full min-w-0 lg:order-none lg:w-auto lg:flex-1">
			<h1 className="text-lg font-extrabold lg:text-xl">
				{when} · {dict.kind[room.kind]} {lang.zh} × {lang.en}
			</h1>
			<div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-ink-500">
				<Chip icon={KeyRound}>{fill(dict.roomCode, { code: room.code })}</Chip>
				<Chip icon={Users}>{fill(dict.people, { count: room.participants.length })}</Chip>
				<Chip icon={Clock}>{fill(dict.total, { minutes: room.durationMinutes })}</Chip>
			</div>
		</div>
	);
}

function Chip({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) {
	return (
		<span className="flex items-center gap-1.5 rounded-full border border-ink-100 bg-surface px-3 py-1.5">
			<Icon aria-hidden="true" className="size-3.5 text-primary-500" />
			{children}
		</span>
	);
}
