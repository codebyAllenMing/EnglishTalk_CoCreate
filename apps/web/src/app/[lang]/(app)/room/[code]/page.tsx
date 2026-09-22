import type { Metadata } from "next";
import Chat from "@/Components/Room/Chat";
import ControlBar from "@/Components/Room/ControlBar";
import LanguageTimer from "@/Components/Room/LanguageTimer";
import { FAKE_ROOM } from "@/Components/Room/roomData";
import RoomEndedRedirect from "@/Components/Room/RoomEndedRedirect";
import RoomGate from "@/Components/Room/RoomGate";
import RoomShell from "@/Components/Room/RoomShell";
import SidePanels from "@/Components/Room/SidePanels";
import TopicCard from "@/Components/Room/TopicCard";
import VideoGrid from "@/Components/Room/VideoGrid";
import Whiteboard from "@/Components/Room/Whiteboard";
import WordBank from "@/Components/Room/WordBank";
import { getDictionary, getLocale } from "@/dictionaries";

/**
 * ⚠️ 靜態匯出只能建出這裡列的房號（HAPPY123 不在 DB，進去會顯示「找不到」）。
 *    dev 任何房號都開得起來，內容由 RoomGate 打 API 決定；其他房號要等有 SSR 的部署。
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
 * 結構是「RoomGate（client，問 API 能不能進、拿成員）→ RoomProvider → server 殼 + 畫面」。
 * 成員、白板、聊天、單字、視訊（Cloudflare Realtime SFU）都是真的；只剩話題卡是 mock。
 *
 * P2 的區塊（反應、話題卡）各自獨立一個檔，之後要延後是整檔拿掉。
 */
export default async function RoomPage({ params }: PageProps<"/[lang]/room/[code]">) {
	const { code } = await params;
	const dict = await getDictionary();
	const locale = await getLocale();
	const r = dict.room;

	return (
		<RoomGate code={code} locale={locale} dict={r.gate}>
			<RoomShell>
				<RoomEndedRedirect locale={locale} code={code} />
				<LanguageTimer dict={r.timer} />

				<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] xl:gap-5">
					<div className="flex min-w-0 flex-col gap-4">
						<VideoGrid
							youLabel={r.you}
							micLabel={r.controls.mic}
							camLabel={r.controls.camera}
							offlineLabel={r.offline}
							dict={r.video}
						/>
						<Whiteboard code={code} locale={locale} dict={r.board} />
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
		</RoomGate>
	);
}
