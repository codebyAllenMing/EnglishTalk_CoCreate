"use client";

import { Ghost } from "lucide-react";
import { useEffect, useState } from "react";
import Card from "@/Components/UI/Card";
import type { Dictionary } from "@/dictionaries";
import MonsterCard from "./MonsterCard";
import MonsterFilters from "./MonsterFilters";
import MonsterPanel from "./MonsterPanel";
import { DEFAULT_FILTER, filterMonsters, type Monster, type MonsterFilter } from "./monstersData";

type Props = {
	monsters: readonly Monster[];
	locale: string;
	dict: Dictionary["profile"]["monsters"];
	langDict: Dictionary["profile"]["lang"];
	levelDict: Dictionary["profile"]["level"];
};

/**
 * Find Conversation Monsters 的狀態層：篩選條件 + 目前選中的怪獸。
 *
 * ## 為什麼整區都在 client
 *
 * 跟週曆不同 —— 週曆只有「切週」需要互動，外框與圖例留在 server 就好。
 * 這裡的標題列、格狀、面板**全部**跟著篩選與選取變動，能留在 server 的只剩
 * 一個 Card 外框，拆出去換來的是一堆 props 穿越。所以整塊進 client，
 * 由 MonstersSection（server）負責把字典與假資料餵進來。
 *
 * ## 選中的人由 id 推導，不另存物件
 *
 * selectedId 存 id、選中的物件從**篩選後**的清單裡找。這樣「篩掉正在看的那個人」
 * 會自然收起面板 —— 存物件的話得多寫一個 effect 去比對並清空，而 effect 清 state
 * 一定是渲染兩次。
 */
export default function MonstersBoard({ monsters, locale, dict, langDict, levelDict }: Props) {
	const [filter, setFilter] = useState<MonsterFilter>(DEFAULT_FILTER);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const visible = filterMonsters(monsters, filter);
	const selected = visible.find((m) => m.id === selectedId) ?? null;

	// 窄版的面板是自己刻的浮層，不是 <dialog>，Esc 得自己接 ——
	// 桌機按 Esc 一樣收起面板，兩種版型行為一致
	useEffect(() => {
		if (!selected) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setSelectedId(null);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [selected]);

	return (
		<div id="monsters" className="flex scroll-mt-4 flex-col gap-4 xl:flex-row xl:items-start xl:gap-5">
			<Card className="min-w-0 flex-1 p-4 sm:p-5">
				<header className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-3">
					<h2 className="flex items-center gap-2.5 text-lg font-extrabold">
						<Ghost aria-hidden="true" className="size-5 text-primary-500" />
						{dict.title}
					</h2>
					<div className="ml-auto min-w-0">
						<MonsterFilters
							filter={filter}
							onChange={setFilter}
							dict={dict}
							langDict={langDict}
							levelDict={levelDict}
						/>
					</div>
				</header>

				{visible.length > 0 ? (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5">
						{visible.map((monster) => (
							<MonsterCard
								key={monster.id}
								monster={monster}
								selected={monster.id === selectedId}
								// 再點一次收起 —— 面板的 ✕ 之外的第二條退路
								onSelect={() =>
									setSelectedId(monster.id === selectedId ? null : monster.id)
								}
								locale={locale}
								dict={dict}
							/>
						))}
					</div>
				) : (
					<div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
						<Ghost aria-hidden="true" className="size-10 text-primary-200" />
						<p className="font-extrabold text-ink-400">{dict.empty.title}</p>
						<p className="text-sm text-ink-300">{dict.empty.note}</p>
					</div>
				)}
			</Card>

			<MonsterPanel
				monster={selected}
				onClose={() => setSelectedId(null)}
				locale={locale}
				dict={dict}
				levelDict={levelDict}
			/>
		</div>
	);
}
