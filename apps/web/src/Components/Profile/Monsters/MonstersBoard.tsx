"use client";

import { useEffect, useState } from "react";
import Card from "@/Components/UI/Card";
import { Monster as MonsterIcon } from "@/Components/UI/MonsterIcon";
import type { Dictionary } from "@/dictionaries";
import { getPresence, type PresenceMap } from "@/presence/client";
import { getUsers, type PublicUser } from "@/profile/client";
import MonsterCard from "./MonsterCard";
import MonsterFilters from "./MonsterFilters";
import MonsterPanel from "./MonsterPanel";
import { DEFAULT_FILTER, filterMonsters, fromPublicUser, type MonsterFilter } from "./monstersData";

type Props = {
	locale: string;
	dict: Dictionary["profile"]["monsters"];
	langDict: Dictionary["profile"]["lang"];
	levelDict: Dictionary["profile"]["level"];
};

/** 線上狀態多久拉一次；心跳 60 秒、TTL 兩分鐘，30 秒看得到別人切換 */
const PRESENCE_POLL_MS = 30 * 1000;

/**
 * Find Conversation Monsters 的狀態層：名單、線上狀態、篩選條件、目前選中的怪獸。
 *
 * ## 資料兩支分開拿
 *
 * 名單（/api/users）進頁拿一次；線上狀態（/api/presence）每 30 秒拉一次、分頁回前景時再拉一次，
 * 在背景時不拉。兩者的更新頻率差幾百倍，綁在同一支只會讓名單跟著被重抓。
 * 用 id 在這裡合併成 Monster。
 *
 * ## 為什麼整區都在 client
 *
 * 跟週曆不同 —— 週曆只有「切週」需要互動，外框與圖例留在 server 就好。
 * 這裡的標題列、格狀、面板**全部**跟著篩選與選取變動，能留在 server 的只剩
 * 一個 Card 外框，拆出去換來的是一堆 props 穿越。所以整塊進 client，
 * 由 MonstersSection（server）負責把字典餵進來。
 *
 * ## 選中的人由 id 推導，不另存物件
 *
 * selectedId 存 id、選中的物件從**篩選後**的清單裡找。這樣「篩掉正在看的那個人」
 * 會自然收起面板 —— 存物件的話得多寫一個 effect 去比對並清空，而 effect 清 state
 * 一定是渲染兩次。
 */
export default function MonstersBoard({ locale, dict, langDict, levelDict }: Props) {
	const [users, setUsers] = useState<PublicUser[] | null>(null);
	const [presence, setPresence] = useState<PresenceMap>({});
	const [filter, setFilter] = useState<MonsterFilter>(DEFAULT_FILTER);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		getUsers().then(
			(loaded) => {
				if (!cancelled) setUsers(loaded);
			},
			() => undefined,
		);
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		let cancelled = false;
		const pull = () => {
			if (document.visibilityState !== "visible") return;
			getPresence().then(
				(map) => {
					if (!cancelled) setPresence(map);
				},
				() => undefined,
			);
		};
		pull();
		const interval = setInterval(pull, PRESENCE_POLL_MS);
		document.addEventListener("visibilitychange", pull);
		return () => {
			cancelled = true;
			clearInterval(interval);
			document.removeEventListener("visibilitychange", pull);
		};
	}, []);

	const monsters = users?.map((u) => fromPublicUser(u, presence)) ?? null;
	const visible = monsters ? filterMonsters(monsters, filter) : [];
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
						<MonsterIcon aria-hidden="true" className="size-5 text-primary-500" />
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

				{monsters === null ? (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5">
						{Array.from({ length: 8 }, (_, i) => (
							<div key={i} aria-hidden="true" className="h-52 animate-pulse rounded-2xl bg-ink-100" />
						))}
					</div>
				) : visible.length > 0 ? (
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
						<MonsterIcon aria-hidden="true" className="size-10 text-primary-200" />
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
