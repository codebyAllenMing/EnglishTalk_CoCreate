"use client";

import { useState, type ReactNode } from "react";

type Key = "chat" | "topic" | "words";
type Props = { labels: Record<Key, string>; chat: ReactNode; topic: ReactNode; words: ReactNode };

/**
 * 右欄的三塊：Topic / Chat / Word Bank。
 *
 * xl 以上三塊直排全部顯示（設計稿）；以下改成三個 tab 一次顯示一塊 ——
 * 手機上視訊格已經佔掉整個畫面，三塊直排要捲很久才看得到聊天。
 * 用 CSS 切（hidden xl:block），不是兩套 DOM。
 */
export default function SidePanels({ labels, chat, topic, words }: Props) {
	const [tab, setTab] = useState<Key>("chat");
	const panels: [Key, ReactNode][] = [
		["topic", topic],
		["chat", chat],
		["words", words],
	];

	return (
		<aside className="flex flex-col gap-4">
			<div role="tablist" className="flex gap-1 rounded-xl bg-primary-50 p-1 xl:hidden">
				{panels.map(([key]) => (
					<button
						key={key}
						type="button"
						role="tab"
						aria-selected={tab === key}
						onClick={() => setTab(key)}
						className={`flex-1 rounded-lg py-2 text-sm font-extrabold transition-colors ${
							tab === key ? "bg-surface text-primary-600 shadow-sm" : "text-ink-500 hover:text-primary-600"
						}`}
					>
						{labels[key]}
					</button>
				))}
			</div>
			{panels.map(([key, node]) => (
				<div key={key} role="tabpanel" className={tab === key ? "" : "hidden xl:block"}>
					{node}
				</div>
			))}
		</aside>
	);
}
