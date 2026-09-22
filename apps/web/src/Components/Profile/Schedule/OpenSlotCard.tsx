"use client";

import { ArrowRight, ChevronLeft, Users } from "lucide-react";
import { useEffect, useState } from "react";
import Avatar from "@/Components/UI/Avatar";
import Dialog from "@/Components/UI/Dialog";
import LangBadge from "@/Components/UI/LangBadge";
import { useToast } from "@/Components/UI/ToastProvider";
import type { Dictionary } from "@/dictionaries";
import { getRoom, isCancelled, joinRoom, type OpenRoom, type RoomDetail, type ScheduleItem } from "@/schedule/client";
import { fill } from "../Monsters/monstersData";
import { gridStyle, position, type OpenSlot } from "./scheduleData";
import { MemberList } from "./SlotCard";
import { formatTime } from "./week";

type Props = {
	slot: OpenSlot;
	day: number;
	locale: string;
	dict: Dictionary["profile"]["schedule"];
	closeLabel: string;
	cancelLabel: string;
	/** 申請送出後把「申請中」的那張卡交給週曆 */
	onJoined: (item: ScheduleItem) => void;
	/** 點開才發現房主已經取消了：關掉框之後把它從週曆拿掉 */
	onGone: (code: string) => void;
	/** grid = 週曆上的格子（預設）；row = 列表模式的一列。對話框同一套 */
	variant?: "grid" | "row";
};

type ErrorKey = "full" | "overlap" | "started" | "failed";
type Fresh =
	| { status: "loading" }
	| { status: "ok"; detail: RoomDetail }
	| { status: "cancelled" }
	| { status: "error" };
type Seats = OpenRoom["seats"];

/**
 * 別人開的、可申請的房：黃卡。
 *
 * 一張卡可能是好幾間（同一時段重疊的併在一起，見 openSlots()）：
 *   一間  → 點開直接是「要加入嗎？」
 *   多間  → 先列出那幾間（房主、標題、時間、語言、名額），點一間才進到「要加入嗎？」，可以返回
 *
 * 送出後那間房變成我週曆上的「申請中」卡（onJoined），黃卡自己會因為重算而消失。
 *
 * 清單那份人數是進頁時拉的，中間有人被同意就過期了，所以：
 *   開框（多間）→ 那幾間各打一次 GET /api/rooms/:code 刷新清單上的人數，滿的標「已滿」但仍能點進去看
 *   選到一間  → 再打一次拿最新的人數與誰在裡面列在框裡，滿了鎖住「申請加入」
 * （使用者 2026-09-22）。後端 join 一律再驗一次名額。
 *
 * 黃卡是進頁時拉的，房主中途取消了它還在。點開時後端回 410 cancelled 就顯示「此房間已被取消」，
 * 關掉框才把那間從週曆拿掉（gone）—— 框開著的時候拿掉，這個元件會直接 unmount、框就消失了。
 */
export default function OpenSlotCard({ slot, day, locale, dict, closeLabel, cancelLabel, onJoined, onGone, variant = "grid" }: Props) {
	const o = dict.open;
	const { toast } = useToast();
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<OpenRoom | null>(null);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<ErrorKey | null>(null);
	const [fresh, setFresh] = useState<Fresh>({ status: "loading" });
	/** 清單上各間的最新人數，code → seats；還沒回來的用清單原本的 */
	const [listSeats, setListSeats] = useState<Record<string, Seats>>({});
	/** 這次打開發現已取消的房號，關框時交給週曆 */
	const [gone, setGone] = useState<string[]>([]);

	useEffect(() => {
		if (!open || slot.rooms.length < 2) return;
		let stale = false;
		Promise.allSettled(slot.rooms.map((room) => getRoom(room.code))).then((results) => {
			if (stale) return;
			const next: Record<string, Seats> = {};
			const cancelled: string[] = [];
			results.forEach((r, i) => {
				const code = slot.rooms[i]?.code;
				if (r.status === "fulfilled") next[r.value.code] = r.value.seats;
				else if (code && isCancelled(r.reason)) cancelled.push(code);
			});
			setListSeats(next);
			if (cancelled.length) setGone((prev) => [...new Set([...prev, ...cancelled])]);
		});
		return () => {
			stale = true;
		};
	}, [open, slot.rooms]);

	useEffect(() => {
		if (!open || !selected) return;
		let stale = false;
		getRoom(selected.code).then(
			(detail) => {
				if (!stale) setFresh({ status: "ok", detail });
			},
			(error: unknown) => {
				if (stale) return;
				if (isCancelled(error)) {
					setFresh({ status: "cancelled" });
					setGone((prev) => (prev.includes(selected.code) ? prev : [...prev, selected.code]));
				} else {
					setFresh({ status: "error" });
				}
			},
		);
		return () => {
			stale = true;
		};
	}, [open, selected]);

	const choose = (room: OpenRoom | null) => {
		setFresh({ status: "loading" });
		setError(null);
		setSelected(room);
	};

	const single = slot.rooms.length === 1;
	const minutes = slot.endMinutes - slot.startMinutes;
	const rangeText = `${formatTime(slot.startMinutes, locale)} – ${formatTime(slot.endMinutes, locale)}`;
	const first = slot.rooms[0];

	const openDialog = () => {
		setListSeats({});
		setGone([]);
		choose(single ? (first ?? null) : null);
		setOpen(true);
	};

	const closeDialog = () => {
		setOpen(false);
		gone.forEach(onGone);
	};

	const submit = async (close: () => void) => {
		if (!selected) return;
		setPending(true);
		setError(null);
		const result = await joinRoom(selected.code);
		setPending(false);
		if (!result.ok) {
			if (result.reason === "cancelled") {
				setFresh({ status: "cancelled" });
				setGone((prev) => (prev.includes(selected.code) ? prev : [...prev, selected.code]));
				return;
			}
			setError(result.reason === "network" || result.reason === "unknown" ? "failed" : result.reason);
			return;
		}
		toast(o.requested);
		onJoined(result.item);
		close();
	};

	const seats = fresh.status === "ok" ? fresh.detail.seats : selected?.seats;
	const full = seats !== undefined && seats.taken >= seats.total;
	const cancelled = fresh.status === "cancelled";
	const cardTitle = single && first ? first.title || dict.untitled : fill(o.count, { n: slot.rooms.length });
	const dialogTitle = selected ? selected.title || dict.untitled : fill(o.count, { n: slot.rooms.length });

	return (
		<>
			{variant === "row" ? (
				<button
					type="button"
					onClick={openDialog}
					className="flex w-full flex-col gap-1 rounded-xl bg-token/20 px-3 py-2.5 text-left text-ink transition-colors hover:bg-token/40"
				>
					<span className="flex w-full items-center gap-2">
						<span className="text-xs font-extrabold text-ink-600 tabular-nums">{rangeText}</span>
						<span className="ml-auto shrink-0 rounded-full bg-token/50 px-2 py-0.5 text-[11px] font-extrabold text-ink">{dict.list.open}</span>
					</span>
					<span className="line-clamp-2 w-full text-sm leading-snug font-extrabold">{cardTitle}</span>
					{single && first ? (
						<span className="flex items-center gap-1.5 text-xs text-ink-500">
							<span>{first.host.name}</span>
							<LangBadge code={first.from} className="size-4.5 text-[8px]" />
							<ArrowRight aria-hidden="true" className="size-3 text-ink-400" />
							<LangBadge code={first.to} className="size-4.5 text-[8px]" />
							<span className="ml-1 flex items-center gap-1 font-extrabold text-secondary-600">
								<Users aria-hidden="true" className="size-3.5" />
								{first.seats.taken}/{first.seats.total}
							</span>
						</span>
					) : (
						<span className="text-xs text-ink-500">{o.pick}</span>
					)}
				</button>
			) : (
			<button
				type="button"
				onClick={openDialog}
				style={gridStyle(slot, day)}
				className="m-0.5 flex flex-col overflow-hidden rounded-xl bg-token/25 px-2 py-0.5 text-left text-ink transition-colors hover:bg-token/55"
			>
				<span className="w-full truncate text-xs leading-tight font-extrabold">{cardTitle}</span>
				{minutes >= 40 && (
					<span className="w-full truncate text-[11px] leading-tight text-ink-500">
						{single && first ? first.host.name : rangeText}
					</span>
				)}
				{minutes >= 60 && single && first && <LangLine room={first} />}
			</button>
			)}

			<Dialog
				open={open}
				onClose={closeDialog}
				title={dialogTitle}
				description={selected ? roomTime(selected, locale) : rangeText}
				closeLabel={closeLabel}
				closeOnBackdrop={!pending}
				cancel={{ label: cancelLabel, disabled: pending }}
				confirm={selected && !cancelled ? { label: o.join, disabled: pending || full, onClick: submit } : undefined}
			>
				{selected ? (
					<>
						{!single && (
							<button
								type="button"
								onClick={() => choose(null)}
								// 有底色的藥丸，跟右上角的 ✕ 同一個灰（使用者 2026-09-22：純文字看起來不像按鈕）
								className="mb-3 flex items-center gap-1 rounded-full bg-app py-1.5 pr-3.5 pl-2.5 text-sm font-extrabold text-ink transition-colors hover:bg-primary-100 hover:text-primary-600"
							>
								<ChevronLeft aria-hidden="true" className="size-4" />
								{o.back}
							</button>
						)}
						<dl className="divide-y divide-ink-100 text-sm">
							<Row label={dict.detail.host}>
								<span className="flex items-center gap-2">
									<Avatar src={`avatar-${selected.host.avatar}`} className="w-7" sizes="28px" />
									{selected.host.name}
								</span>
							</Row>
							<Row label={dict.detail.time}>{roomTime(selected, locale)}</Row>
							<Row label={dict.detail.languages}>
								<span className="flex items-center gap-1.5">
									<LangBadge code={selected.from} className="size-5 text-[9px]" />
									<ArrowRight aria-hidden="true" className="size-3 text-ink-400" />
									<LangBadge code={selected.to} className="size-5 text-[9px]" />
								</span>
							</Row>
							<Row label={dict.detail.participants}>
								{seats ? `${seats.taken}/${seats.total}` : ""}
							</Row>
						</dl>
						{!cancelled && (
							<section className="mt-4">
								<h3 className="mb-2 text-sm text-ink-500">{dict.detail.members}</h3>
								{fresh.status === "ok" ? (
									<MemberList members={fresh.detail.members} meId={undefined} dict={dict.detail} />
								) : fresh.status === "error" ? (
									<p className="text-sm text-ink-400">{dict.detail.membersFailed}</p>
								) : (
									<ul aria-hidden="true" className="flex flex-wrap gap-2">
										{Array.from({ length: Math.max(1, selected.seats.taken) }, (_, i) => (
											<li key={i} className="h-9 w-24 animate-pulse rounded-full bg-ink-100" />
										))}
									</ul>
								)}
							</section>
						)}
						{cancelled ? (
							<p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-bold text-danger">
								{dict.cancelledRoom}
							</p>
						) : (
							<div className="mt-4 rounded-xl bg-token/15 p-4">
								<p className="font-extrabold">{full ? o.full : o.question}</p>
								{!full && <p className="mt-1 text-sm text-ink-500">{o.hint}</p>}
							</div>
						)}
						{error && (
							<p role="alert" className="mt-3 rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-bold text-danger">
								{o[error]}
							</p>
						)}
					</>
				) : (
					<>
						<p className="mb-2 text-sm text-ink-500">{o.pick}</p>
						<ul className="flex flex-col gap-2">
							{slot.rooms.map((room) => {
								const roomSeats = listSeats[room.code] ?? room.seats;
								const roomGone = gone.includes(room.code);
								const roomFull = roomSeats.taken >= roomSeats.total;
								return (
									<li key={room.code}>
										{/* 滿了也能點進去看是誰在裡面，只是到了那一頁不能申請（使用者 2026-09-22） */}
										<button
											type="button"
											onClick={() => choose(room)}
											className="flex w-full items-center gap-3 rounded-xl border border-ink-100 p-2.5 text-left transition-colors hover:border-primary-300 hover:bg-primary-50"
										>
											<Avatar src={`avatar-${room.host.avatar}`} className="w-10 shrink-0" sizes="40px" />
											<span className="min-w-0 flex-1">
												<span className="block truncate text-sm font-extrabold">{room.title || dict.untitled}</span>
												<span className="block truncate text-xs text-ink-500">
													{room.host.name} · {roomTime(room, locale)}
												</span>
											</span>
											<LangLine
												room={{ ...room, seats: roomSeats }}
												className="shrink-0"
												fullLabel={roomGone ? o.cancelledTag : roomFull ? o.fullTag : undefined}
											/>
										</button>
									</li>
								);
							})}
						</ul>
					</>
				)}
			</Dialog>
		</>
	);
}

function roomTime(room: OpenRoom, locale: string): string {
	const p = position(room.startDate, room.endDate);
	return `${formatTime(p.startMinutes, locale)} – ${formatTime(p.endMinutes, locale)}`;
}

function LangLine({
	room,
	className = "mt-auto w-full pt-0.5",
	fullLabel,
}: {
	room: OpenRoom;
	className?: string;
	/** 有給就取代人數，用來標「已滿」 */
	fullLabel?: string;
}) {
	return (
		<span className={`flex items-center gap-1 ${className}`}>
			<LangBadge code={room.from} className="size-5 text-[9px]" />
			<ArrowRight aria-hidden="true" className="size-3 text-ink-400" />
			<LangBadge code={room.to} className="size-5 text-[9px]" />
			<span
				className={`ml-auto flex items-center gap-1 pl-2 text-[11px] font-extrabold ${
					fullLabel ? "text-danger" : "text-secondary-600"
				}`}
			>
				<Users aria-hidden="true" className="size-3.5" />
				{fullLabel ?? `${room.seats.taken}/${room.seats.total}`}
			</span>
		</span>
	);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between gap-4 py-2.5">
			<dt className="text-ink-500">{label}</dt>
			<dd className="font-semibold">{children}</dd>
		</div>
	);
}
