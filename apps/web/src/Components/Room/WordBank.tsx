"use client";

import { BookOpen, X } from "lucide-react";
import Card from "@/Components/UI/Card";
import type { Dictionary } from "@/dictionaries";
import { posCodeOf } from "@/words/client";
import { fill } from "../Profile/Monsters/monstersData";
import { useRoom } from "./RoomProvider";

type Props = { dict: Dictionary["room"]["wordBank"]; posDict: Dictionary["room"]["saveWord"]["posOptions"] };

/**
 * 這一場存下來的字（使用者 2026-09-21：面板只顯示這場的；完整字典是側邊欄的
 * Word Bank 頁，之後做）。每列只有刪除，沒有星號。資料來自 RoomProvider（GET /api/rooms/:code/words）。
 */
export default function WordBank({ dict, posDict }: Props) {
	const { words, removeWord } = useRoom();

	return (
		<Card className="p-4">
			<h2 className="flex items-center gap-2 font-extrabold">
				<BookOpen aria-hidden="true" className="size-5 text-primary-500" />
				{dict.title}
				<span className="ml-auto rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-extrabold text-primary-600 tabular-nums">
					{words.length}
				</span>
			</h2>

			{words.length === 0 ? (
				<p className="mt-3 py-6 text-center text-sm text-ink-300">{dict.empty}</p>
			) : (
				<ul className="mt-2 divide-y divide-ink-100">
					{words.map((w) => (
						<li key={w.id} className="flex items-start gap-3 py-2.5">
							<div className="min-w-0 flex-1">
								<p className="text-sm">
									<span className="font-extrabold">{w.word}</span>
									<span className="ml-1.5 text-ink-400">({posDict[posCodeOf(w.pos)]})</span>
								</p>
								{w.meaning && <p className="text-sm text-ink-500">{w.meaning}</p>}
							</div>
							<button
								type="button"
								aria-label={fill(dict.remove, { word: w.word })}
								onClick={() => void removeWord(w.id)}
								className="rounded-full p-1.5 text-ink-300 transition-colors hover:bg-primary-50 hover:text-primary-600"
							>
								<X aria-hidden="true" className="size-4" />
							</button>
						</li>
					))}
				</ul>
			)}
		</Card>
	);
}
