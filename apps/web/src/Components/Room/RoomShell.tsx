import { Clock, KeyRound, Users } from "lucide-react";
import type { ReactNode } from "react";
import BrandBlock from "@/Components/Profile/BrandBlock";
import TopBar from "@/Components/Profile/TopBar";
import { fill } from "@/Components/Profile/Monsters/monstersData";
import { getDictionary, getLocale } from "@/dictionaries";
import LeaveRoomButton from "./LeaveRoomButton";
import { parseLocalDateTime, type Room } from "./roomData";

type Props = { room: Room; code: string; children: ReactNode };

/**
 * 對話室的殼：品牌 + 房間資訊 + 頂部列 + 離開。**沒有側邊欄導覽** ——
 * 進了房就是在講話，導覽會把人帶走。所以不用 AppShell，只共用 BrandBlock / TopBar。
 *
 * 全寬版面；窄版底部要留位置給固定的 ControlBar（pb-24）。
 */
export default async function RoomShell({ room, code, children }: Props) {
	const dict = await getDictionary();
	const locale = await getLocale();
	const r = dict.room;
	const when = new Intl.DateTimeFormat(locale, { weekday: "long", hour: "numeric", minute: "2-digit" }).format(
		parseLocalDateTime(room.startsAt),
	);
	const title = `${when} · ${r.kind[room.kind]} ${dict.profile.lang.zh} × ${dict.profile.lang.en}`;

	return (
		<div className="min-h-dvh bg-app">
			<div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 pt-4 pb-24 lg:px-6 lg:pt-5 lg:pb-6">
				<header className="flex flex-wrap items-start gap-x-6 gap-y-3">
					<div className="lg:hidden">
						<BrandBlock compact />
					</div>
					<div className="hidden lg:block">
						<BrandBlock />
					</div>

					<div className="order-last w-full min-w-0 lg:order-none lg:w-auto lg:flex-1">
						<h1 className="text-lg font-extrabold lg:text-xl">{title}</h1>
						<div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-ink-500">
							<Chip icon={KeyRound}>{fill(r.roomCode, { code })}</Chip>
							<Chip icon={Users}>{fill(r.people, { count: room.participants.length })}</Chip>
							<Chip icon={Clock}>{fill(r.total, { minutes: room.durationMinutes })}</Chip>
						</div>
					</div>

					<div className="ml-auto flex flex-col items-end gap-2">
						<TopBar />
						<LeaveRoomButton locale={locale} dict={r} closeLabel={dict.common.close} cancelLabel={dict.common.cancel} />
					</div>
				</header>

				{children}
			</div>
		</div>
	);
}

function Chip({ icon: Icon, children }: { icon: typeof Clock; children: ReactNode }) {
	return (
		<span className="flex items-center gap-1.5 rounded-full border border-ink-100 bg-surface px-3 py-1">
			<Icon aria-hidden="true" className="size-3.5 text-ink-400" />
			{children}
		</span>
	);
}
