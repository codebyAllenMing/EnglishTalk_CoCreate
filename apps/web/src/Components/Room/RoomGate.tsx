"use client";

import { DoorClosed } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Card from "@/Components/UI/Card";
import type { Dictionary } from "@/dictionaries";
import { getRoomEntry, type RoomEntry } from "@/room/client";
import { fill } from "../Profile/Monsters/monstersData";
import { FAKE_ROOM, formatClock, toLocalDateTime, type Room } from "./roomData";
import RoomProvider from "./RoomProvider";

type Props = {
	code: string;
	locale: string;
	dict: Dictionary["room"]["gate"];
	children: ReactNode;
};

type State = { status: "loading" } | { status: "ok"; room: Room } | { status: "denied"; entry: RoomEntry & { ok: false } };

/**
 * 進房的門（體驗層）。載入時打 GET /api/rooms/:code/entry：
 *
 *   ok          → 用回來的成員組出 Room，掛 RoomProvider，畫房間
 *   notStarted  → 倒數到開始前 5 分鐘，時間到再問一次
 *   ended       → 走首頁的 ?ended= 提示（跟兩桶跑完同一條路）
 *   其他        → 顯示原因與「回首頁」
 *
 * ⚠️ 這裡擋不住直接開 WS 或直接打 API 的人 —— 那是 server 端 roomAccess 的事，白板握手與簽 token 各自再查。
 *
 * children 是 server 渲染好的房間畫面（RoomShell 等），等門開了才掛進 provider 底下。
 * 聊天、話題、單字還是 mock：訊息的 from 改指到真成員，畫面才對得上。
 */
export default function RoomGate({ code, locale, dict, children }: Props) {
	const router = useRouter();
	const [state, setState] = useState<State>({ status: "loading" });
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		let stale = false;
		getRoomEntry(code).then((entry) => {
			if (stale) return;
			if (entry.ok) setState({ status: "ok", room: toRoom(entry) });
			else if (entry.reason === "ended") router.replace(`/${locale}/home?ended=${encodeURIComponent(code)}`);
			else setState({ status: "denied", entry });
		});
		return () => {
			stale = true;
		};
	}, [code, locale, router, attempt]);

	if (state.status === "ok") return <RoomProvider room={state.room}>{children}</RoomProvider>;

	return (
		<div className="flex min-h-dvh items-center justify-center bg-app px-4">
			<Card className="w-full max-w-md p-8 text-center">
				{state.status === "loading" ? (
					<>
						<div aria-hidden="true" className="mx-auto size-16 animate-pulse rounded-full bg-primary-100" />
						<p className="mt-4 text-sm text-ink-500">{dict.loading}</p>
					</>
				) : state.entry.reason === "notStarted" && state.entry.opensAt ? (
					<Countdown opensAt={state.entry.opensAt} dict={dict} locale={locale} onOpen={() => setAttempt((n) => n + 1)} />
				) : (
					<>
						<DoorClosed aria-hidden="true" className="mx-auto size-12 text-primary-400" />
						<h1 className="mt-4 text-lg font-extrabold">{dict[state.entry.reason]}</h1>
						<Link
							href={`/${locale}/home`}
							className="mt-6 inline-block rounded-full bg-primary-500 px-6 py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-primary-600"
						>
							{dict.home}
						</Link>
					</>
				)}
			</Card>
		</div>
	);
}

/** 還沒到開放時間：倒數到 opensAt，到了通知上層再問一次 API */
function Countdown({
	opensAt,
	dict,
	locale,
	onOpen,
}: {
	opensAt: string;
	dict: Dictionary["room"]["gate"];
	locale: string;
	onOpen: () => void;
}) {
	const target = new Date(opensAt).getTime();
	const [now, setNow] = useState<number | null>(null);

	useEffect(() => {
		const tick = () => {
			const t = Date.now();
			setNow(t);
			if (t >= target) onOpen();
		};
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [target, onOpen]);

	const time = new Intl.DateTimeFormat(locale, { weekday: "long", hour: "numeric", minute: "2-digit" }).format(new Date(target));
	const seconds = now === null ? null : Math.ceil((target - now) / 1000);

	return (
		<>
			<DoorClosed aria-hidden="true" className="mx-auto size-12 text-primary-400" />
			<h1 className="mt-4 text-lg font-extrabold">{fill(dict.notStarted, { time })}</h1>
			<p className="mt-3 text-3xl font-extrabold text-primary-600 tabular-nums">
				{seconds === null ? "" : formatClock(seconds)}
			</p>
		</>
	);
}

/**
 * API 的答案 → RoomProvider 要的 Room。成員是真的；聊天、話題、單字還是 mock，
 * mock 訊息的 from 輪流指到真成員，不然對不到頭像與名字。
 */
function toRoom(entry: RoomEntry & { ok: true }): Room {
	const participants = entry.participants.map((p) => ({
		id: p.id,
		avatar: p.avatar,
		name: p.name,
		lang: p.lang,
		me: p.me,
	}));
	return {
		code: entry.room.code,
		kind: "casual",
		startsAt: toLocalDateTime(new Date(entry.room.startDate)),
		durationMinutes: entry.room.durationMinutes,
		participants,
		messages: FAKE_ROOM.messages.map((m, i) => ({ ...m, from: participants[i % participants.length]?.id ?? m.from })),
		topics: FAKE_ROOM.topics,
		words: FAKE_ROOM.words,
	};
}
