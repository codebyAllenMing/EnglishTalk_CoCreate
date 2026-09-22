"use client";

import { ArrowRight, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "@/auth/SessionProvider";
import Avatar from "@/Components/UI/Avatar";
import Dialog from "@/Components/UI/Dialog";
import LangBadge from "@/Components/UI/LangBadge";
import { useToast } from "@/Components/UI/ToastProvider";
import type { Dictionary } from "@/dictionaries";
import {
	cancelRoom,
	decideRequest,
	getRoom,
	isCancelled,
	leaveRoom,
	type RoomDetail,
	type RoomMember,
	type ScheduleItem,
} from "@/schedule/client";
import { gridStyle, type MineSlot } from "./scheduleData";
import { formatTime, parseLocalDate } from "./week";

type Props = {
	slot: MineSlot;
	/** 該時段落在這一週的第幾欄。由 slotsInWeek() 算好傳進來 */
	day: number;
	locale: string;
	dict: Dictionary["profile"]["schedule"];
	closeLabel: string;
	/** 取消房 / 取消申請之後通知週曆把這張卡拿掉 */
	onRemoved: (code: string) => void;
	/** 同意了申請之後人數變了，通知週曆換掉這張卡的資料 */
	onUpdated: (item: ScheduleItem) => void;
};

type Detail =
	| { status: "loading" }
	| { status: "ok"; detail: RoomDetail }
	/** 房主取消了、我這邊的卡還在：顯示「此房間已被取消」，關框時拿掉 */
	| { status: "cancelled" }
	| { status: "error" };
type CancelStep = "idle" | "confirm" | "pending";

/**
 * 我有份的房的卡片 + 詳情對話框。同一個元件依我跟房的關係開出三種框：
 *
 *   房主（hosted）        已加入的人、申請中的人（同意 / 拒絕）、取消（未開始才有）
 *   已加入（approved）    已加入的人（退出還沒做）
 *   申請中（requested）   已加入的人、「等房主同意」、取消申請
 *
 * 別人的、可申請的房是另一個元件 OpenSlotCard。
 *
 * ## 詳情打開才拉
 *
 * 週曆清單（GET /api/me/schedule）不帶成員 —— 一週十幾張卡全帶是浪費，而且大多不會被點開。
 * 打開時打 GET /api/rooms/:code，等的時候依人數畫幾顆骨架。所以 Dialog 走受控模式：trigger 模式沒有「打開了」的回呼。
 *
 * ## 「還沒開始」在打開那一刻算
 *
 * 取消 / 審核 / 取消申請都只在開始前允許。render 裡不能讀時鐘（React Compiler 的 purity 規則），所以放 state。
 * 後端一律再擋一次。
 *
 * ## 定位
 *
 * 靠 grid-column / grid-row，見 gridStyle()。一格 10 分鐘，卡片高度由房的長度決定，內容跟著長度縮：
 *   20 分鐘 = 24px 只有標題；40 = 48px 加時間；60 = 72px 才有語言列與人數。
 */
const TONE: Record<"hosted" | "session" | "requested", string> = {
	hosted: "bg-primary-100 py-0.5 text-ink hover:bg-primary-200",
	session: "bg-secondary-100 py-0.5 text-ink hover:bg-secondary-200",
	// 申請中：虛線框、淡底。border 佔掉 2px，所以 py-0 才塞得下 20 分鐘那一行標題
	requested: "border border-dashed border-secondary-400 bg-secondary-50 py-0 text-ink hover:bg-secondary-100",
};

export default function SlotCard({ slot, day, locale, dict, closeLabel, onRemoved, onUpdated }: Props) {
	const { user } = useSession();
	const { toast } = useToast();
	const [open, setOpen] = useState(false);
	const [detail, setDetail] = useState<Detail>({ status: "loading" });
	const [canAct, setCanAct] = useState(false);
	const [cancelStep, setCancelStep] = useState<CancelStep>("idle");
	/** 進行中的動作：取消申請、或正在審核的那個人的 userId */
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const requested = slot.status === "requested";
	const tone = requested ? "requested" : slot.kind;

	useEffect(() => {
		if (!open) return;
		let stale = false;
		getRoom(slot.code).then(
			(d) => {
				if (!stale) setDetail({ status: "ok", detail: d });
			},
			(error: unknown) => {
				if (!stale) setDetail({ status: isCancelled(error) ? "cancelled" : "error" });
			},
		);
		return () => {
			stale = true;
		};
	}, [open, slot.code]);

	const openDialog = () => {
		const start = parseLocalDate(slot.date);
		start.setMinutes(slot.startMinutes);
		setCanAct(start.getTime() > Date.now());
		setDetail({ status: "loading" });
		setCancelStep("idle");
		setBusy(null);
		setError(null);
		setOpen(true);
	};

	const confirmCancel = async () => {
		setCancelStep("pending");
		setError(null);
		const result = await cancelRoom(slot.code);
		if (result.ok) {
			toast(dict.cancel.done);
			setOpen(false);
			onRemoved(slot.code);
			return;
		}
		setCancelStep("confirm");
		setError(result.reason === "started" ? dict.cancel.started : dict.cancel.failed);
	};

	const closeDialog = () => {
		setOpen(false);
		if (detail.status === "cancelled") onRemoved(slot.code);
	};

	const withdraw = async () => {
		setBusy("withdraw");
		setError(null);
		const result = await leaveRoom(slot.code);
		setBusy(null);
		if (!result.ok && result.reason === "cancelled") {
			setDetail({ status: "cancelled" });
			return;
		}
		if (result.ok) {
			toast(dict.pending.withdrawn);
			setOpen(false);
			onRemoved(slot.code);
			return;
		}
		setError(dict.pending.failed);
	};

	const decide = async (userId: string, decision: "approve" | "reject") => {
		setBusy(userId);
		setError(null);
		const result = await decideRequest(slot.code, userId, decision);
		setBusy(null);
		if (!result.ok && result.reason === "cancelled") {
			setDetail({ status: "cancelled" });
			return;
		}
		if (!result.ok) {
			setError(
				result.reason === "full"
					? dict.requests.full
					: result.reason === "overlap"
						? dict.requests.overlap
						: dict.requests.failed,
			);
			return;
		}
		setDetail({ status: "ok", detail: result.detail });
		// 能審核的一定是房主，status 一定是 approved；RoomDetail 的 status 多了 none 所以要收窄
		onUpdated({ ...result.detail, status: "approved" });
	};

	const minutes = slot.endMinutes - slot.startMinutes;
	const time = `${formatTime(slot.startMinutes, locale)} – ${formatTime(slot.endMinutes, locale)}`;
	const title = slot.title || dict.untitled;
	const seats = detail.status === "ok" ? detail.detail.seats : slot.seats;
	const requests = detail.status === "ok" && slot.kind === "hosted" ? detail.detail.requests : [];
	const cancelled = detail.status === "cancelled";

	return (
		<>
			<button
				type="button"
				onClick={openDialog}
				style={gridStyle(slot, day)}
				className={`m-0.5 flex flex-col overflow-hidden rounded-xl px-2 text-left transition-colors ${TONE[tone]}`}
			>
				<span className="flex w-full items-center gap-1">
					<span className="min-w-0 flex-1 truncate text-xs leading-tight font-extrabold">{title}</span>
					{requested && (
						<span className="shrink-0 text-[10px] leading-tight font-extrabold text-secondary-600">
							{dict.pending.tag}
						</span>
					)}
				</span>
				{minutes >= 40 && (
					<span className="w-full truncate text-[11px] leading-tight text-ink-500">{time}</span>
				)}
				{minutes >= 60 && (
					<span className="mt-auto flex w-full items-center gap-1 pt-0.5">
						<LangBadge code={slot.from} className="size-5 text-[9px]" />
						<ArrowRight aria-hidden="true" className="size-3 text-ink-400" />
						<LangBadge code={slot.to} className="size-5 text-[9px]" />
						<span className="ml-auto flex items-center gap-1 text-[11px] font-extrabold text-secondary-600">
							<Users aria-hidden="true" className="size-3.5" />
							{slot.seats.taken}/{slot.seats.total}
						</span>
					</span>
				)}
			</button>

			<Dialog
				open={open}
				onClose={closeDialog}
				title={title}
				description={time}
				closeLabel={closeLabel}
				closeOnBackdrop={cancelStep !== "pending" && busy === null}
			>
				<dl className="divide-y divide-ink-100 text-sm">
					<Row label={dict.detail.type}>{requested ? dict.pending.tag : dict.legend[slot.kind]}</Row>
					<Row label={dict.detail.time}>{time}</Row>
					<Row label={dict.detail.languages}>
						<span className="flex items-center gap-1.5">
							<LangBadge code={slot.from} className="size-5 text-[9px]" />
							<ArrowRight aria-hidden="true" className="size-3 text-ink-400" />
							<LangBadge code={slot.to} className="size-5 text-[9px]" />
						</span>
					</Row>
					<Row label={dict.detail.participants}>
						{seats.taken}/{seats.total}
					</Row>
					<Row label={dict.detail.code}>
						<span className="font-mono tracking-wider">{slot.code}</span>
					</Row>
				</dl>

				{cancelled && (
					<p role="alert" className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-bold text-danger">
						{dict.cancelledRoom}
					</p>
				)}

				<section className={`mt-4 ${cancelled ? "hidden" : ""}`}>
					<h3 className="mb-2 text-sm text-ink-500">{dict.detail.members}</h3>
					{detail.status === "error" || detail.status === "cancelled" ? (
						<p className="text-sm text-ink-400">{dict.detail.membersFailed}</p>
					) : detail.status === "loading" ? (
						<MemberSkeleton count={slot.seats.taken} />
					) : (
						<MemberList members={detail.detail.members} meId={user?.id} dict={dict.detail} />
					)}
				</section>

				{requests.length > 0 && (
					<section className="mt-4">
						<h3 className="mb-2 text-sm text-ink-500">{dict.requests.title}</h3>
						<ul className="flex flex-col gap-2">
							{requests.map((r) => (
								<li key={r.id} className="flex items-center gap-2 rounded-xl border border-ink-100 py-1.5 pr-1.5 pl-2">
									<Avatar src={`avatar-${r.avatar}`} className="w-7" sizes="28px" />
									<span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.name}</span>
									{canAct && (
										<>
											<SmallButton
												disabled={busy !== null}
												onClick={() => decide(r.id, "reject")}
												className="border border-ink-200 text-ink-500 hover:border-danger hover:text-danger"
											>
												{dict.requests.reject}
											</SmallButton>
											<SmallButton
												disabled={busy !== null}
												onClick={() => decide(r.id, "approve")}
												className="bg-primary-500 text-white hover:bg-primary-600"
											>
												{dict.requests.approve}
											</SmallButton>
										</>
									)}
								</li>
							))}
						</ul>
					</section>
				)}

				{requested && !cancelled && (
					<div className="mt-5 rounded-xl bg-secondary-50 p-4 text-sm">
						<p className="font-semibold text-secondary-700">{dict.pending.waiting}</p>
						{canAct && (
							<button
								type="button"
								disabled={busy !== null}
								onClick={withdraw}
								className="mt-3 w-full rounded-full border-2 border-ink-200 py-2.5 text-sm font-extrabold transition-colors hover:border-danger hover:text-danger disabled:opacity-60"
							>
								{dict.pending.withdraw}
							</button>
						)}
					</div>
				)}

				{error && cancelStep === "idle" && (
					<p role="alert" className="mt-3 rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-bold text-danger">
						{error}
					</p>
				)}

				{slot.kind === "hosted" && canAct && !cancelled && (
					<div className="mt-5">
						{cancelStep === "idle" ? (
							<button
								type="button"
								onClick={() => setCancelStep("confirm")}
								className="w-full rounded-full border-2 border-danger/30 py-2.5 text-sm font-extrabold text-danger transition-colors hover:border-danger hover:bg-danger/10"
							>
								{dict.cancel.button}
							</button>
						) : (
							<div className="rounded-xl bg-danger/5 p-4">
								<p className="text-sm text-ink-600">{dict.cancel.confirm}</p>
								{error && (
									<p role="alert" className="mt-2 text-sm font-bold text-danger">
										{error}
									</p>
								)}
								<div className="mt-3 flex gap-3">
									<button
										type="button"
										disabled={cancelStep === "pending"}
										onClick={() => setCancelStep("idle")}
										className="flex-1 rounded-full border-2 border-ink-200 py-2.5 text-sm font-extrabold transition-colors hover:border-primary-400 hover:text-primary-600 disabled:opacity-60"
									>
										{dict.cancel.keep}
									</button>
									<button
										type="button"
										disabled={cancelStep === "pending"}
										onClick={confirmCancel}
										className="flex-1 rounded-full bg-danger py-2.5 text-sm font-extrabold text-white transition-colors hover:bg-danger/90 disabled:cursor-progress disabled:opacity-60"
									>
										{dict.cancel.yes}
									</button>
								</div>
							</div>
						)}
					</div>
				)}
			</Dialog>
		</>
	);
}

/** 已加入的人（含房主、含自己）。OpenSlotCard 的清單也用它 */
export function MemberList({
	members,
	meId,
	dict,
}: {
	members: RoomMember[];
	meId: string | undefined;
	dict: Dictionary["profile"]["schedule"]["detail"];
}) {
	return (
		<ul className="flex flex-wrap gap-2">
			{members.map((m) => (
				<li
					key={m.id}
					className="flex items-center gap-2 rounded-full border border-ink-100 py-1 pr-3 pl-1 text-sm font-semibold"
				>
					<Avatar src={`avatar-${m.avatar}`} className="w-7" sizes="28px" />
					{m.name}
					{m.id === meId && <span className="font-normal text-ink-400">{dict.you}</span>}
					{m.role === "host" && (
						<span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-extrabold text-primary-600">
							{dict.host}
						</span>
					)}
				</li>
			))}
		</ul>
	);
}

/** 載入中依人數畫幾顆，形狀跟真的一樣，不會跳版 */
function MemberSkeleton({ count }: { count: number }) {
	return (
		<ul aria-hidden="true" className="flex flex-wrap gap-2">
			{Array.from({ length: Math.max(1, count) }, (_, i) => (
				<li key={i} className="h-9 w-24 animate-pulse rounded-full bg-ink-100" />
			))}
		</ul>
	);
}

function SmallButton({
	disabled,
	onClick,
	className,
	children,
}: {
	disabled: boolean;
	onClick: () => void;
	className: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold transition-colors disabled:opacity-60 ${className}`}
		>
			{children}
		</button>
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
