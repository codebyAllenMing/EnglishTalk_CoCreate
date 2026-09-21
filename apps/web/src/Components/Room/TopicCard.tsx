"use client";

import { MessagesSquare, RefreshCw, Sparkles } from "lucide-react";
import Card from "@/Components/UI/Card";
import type { Dictionary } from "@/dictionaries";
import { useRoom } from "./RoomProvider";

type Props = { dict: Dictionary["room"]["topic"] };

/**
 * 話題卡。從假清單抽；盤點的 B5 是 LLM 出題（P1，延後），到時候換 nextTopic 的來源。
 *
 * 顯示**現在輪到的語言**那個版本 —— 話題跟著計時條走，中文時間抽到的是中文題。
 */
export default function TopicCard({ dict }: Props) {
	const { room, topicIndex, timer, nextTopic } = useRoom();
	const topic = room.topics[topicIndex][timer.active];

	return (
		<Card className="p-4">
			<h2 className="flex items-center gap-2 font-extrabold">
				<Sparkles aria-hidden="true" className="size-5 text-primary-500" />
				{dict.title}
			</h2>
			<p className="mt-0.5 text-xs text-ink-500">{dict.hint}</p>

			<div className="mt-3 flex items-center gap-3">
				<button
					type="button"
					onClick={nextTopic}
					className="flex min-h-20 flex-1 items-center justify-center rounded-xl border border-ink-100 bg-app px-4 py-3 text-center text-lg font-extrabold transition-colors hover:border-primary-300 hover:bg-primary-50"
				>
					{topic}
				</button>
				<button
					type="button"
					aria-label={dict.next}
					onClick={nextTopic}
					className="rounded-full p-2 text-ink-400 transition-colors hover:bg-primary-50 hover:text-primary-600"
				>
					<RefreshCw aria-hidden="true" className="size-4" />
				</button>
				<MessagesSquare aria-hidden="true" className="hidden size-12 shrink-0 text-primary-300 sm:block" />
			</div>
		</Card>
	);
}
