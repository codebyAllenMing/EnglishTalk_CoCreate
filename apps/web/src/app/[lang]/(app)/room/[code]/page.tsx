import type { Metadata } from "next";
import Chat from "@/Components/Room/Chat";
import ControlBar from "@/Components/Room/ControlBar";
import LanguageTimer from "@/Components/Room/LanguageTimer";
import { FAKE_ROOM } from "@/Components/Room/roomData";
import RoomEndedRedirect from "@/Components/Room/RoomEndedRedirect";
import RoomProvider from "@/Components/Room/RoomProvider";
import RoomShell from "@/Components/Room/RoomShell";
import SidePanels from "@/Components/Room/SidePanels";
import TopicCard from "@/Components/Room/TopicCard";
import VideoGrid from "@/Components/Room/VideoGrid";
import Whiteboard from "@/Components/Room/Whiteboard";
import WordBank from "@/Components/Room/WordBank";
import { getDictionary, getLocale } from "@/dictionaries";

/**
 * ⚠️ 靜態匯出只能建出這裡列的房號。dev 任何房號都開得起來（內容都是假房），
 *    其他房號要等有 SSR 的部署 —— 那時候路由形狀已經是對的，只是換部署。
 */
export function generateStaticParams() {
	return [{ code: FAKE_ROOM.code }];
}

export async function generateMetadata(): Promise<Metadata> {
	const dict = await getDictionary();
	return { title: `${dict.room.title} — MonsterTalk` };
}

/**
 * 對話室（設計稿 `assets/design/Talk Room.jpg`）。
 *
 * 這一頁沒有任何一塊能留在 server：視訊、聊天、計時、白板全是即時互動。
 * 所以結構是「server 殼 + 一個 client RoomProvider + 一堆從 provider 拿資料的畫面」，
 * 接 LiveKit / WebSocket 時只換 provider 的資料來源。
 *
 * P2 的區塊（白板、反應、話題卡、單字庫）各自獨立一個檔，之後要延後是整檔拿掉。
 */
export default async function RoomPage({ params }: PageProps<"/[lang]/room/[code]">) {
	const { code } = await params;
	const dict = await getDictionary();
	const locale = await getLocale();
	const r = dict.room;

	return (
		<RoomProvider room={FAKE_ROOM}>
			<RoomShell room={FAKE_ROOM} code={code}>
				<RoomEndedRedirect locale={locale} code={code} />
				<LanguageTimer dict={r.timer} />

				<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-5">
					<div className="flex min-w-0 flex-col gap-4">
						<VideoGrid youLabel={r.you} micLabel={r.controls.mic} camLabel={r.controls.camera} />
						<Whiteboard dict={r.board} />
						<ControlBar dict={r.controls} />
					</div>

					<SidePanels
						labels={{ chat: r.chat.title, topic: r.topic.title, words: r.wordBank.title }}
						topic={<TopicCard dict={r.topic} />}
						chat={
							<Chat
								locale={locale}
								youLabel={r.you}
								dict={r.chat}
								saveDict={r.saveWord}
								closeLabel={dict.common.close}
								cancelLabel={dict.common.cancel}
							/>
						}
						words={<WordBank dict={r.wordBank} posDict={r.saveWord.posOptions} />}
					/>
				</div>
			</RoomShell>
		</RoomProvider>
	);
}
