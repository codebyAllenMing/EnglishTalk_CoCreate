import type { ReactNode } from "react";
import BrandBlock from "@/Components/Profile/BrandBlock";
import TopBar from "@/Components/Profile/TopBar";
import { getDictionary, getLocale } from "@/dictionaries";
import LeaveRoomButton from "./LeaveRoomButton";
import RoomHeading from "./RoomHeading";

type Props = { children: ReactNode };

/**
 * 對話室的殼：品牌 + 房間資訊（RoomHeading，client）+ 頂部列 + 離開。**沒有側邊欄導覽** ——
 * 進了房就是在講話，導覽會把人帶走。所以不用 AppShell，只共用 BrandBlock / TopBar。
 *
 * 全寬版面；窄版底部要留位置給固定的 ControlBar（pb-24）。
 */
export default async function RoomShell({ children }: Props) {
	const dict = await getDictionary();
	const locale = await getLocale();
	const r = dict.room;

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

					{/* 房間資料在 client（RoomGate 打 API 才有），標題與 chip 拆到 RoomHeading 讀 useRoom() */}
					<RoomHeading
						locale={locale}
						dict={{ kind: r.kind, roomCode: r.roomCode, people: r.people, total: r.total }}
						lang={dict.profile.lang}
					/>

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
