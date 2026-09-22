"use client";

import { ChevronDown, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import Dialog from "@/Components/UI/Dialog";
import { useToast } from "@/Components/UI/ToastProvider";
import type { Dictionary } from "@/dictionaries";
import { useProfile } from "@/profile/ProfileProvider";
import { createRoom, type RoomDuration, type RoomTypeId, type ScheduleItem } from "@/schedule/client";
import { fill } from "../Monsters/monstersData";
import type { LangCode } from "../profileData";
import { formatTime, parseLocalDate, toISODate } from "./week";

type Props = {
	locale: string;
	dict: Dictionary["profile"]["schedule"];
	lang: Dictionary["profile"]["lang"];
	closeLabel: string;
	cancelLabel: string;
	/** 建好之後把新房交給週曆，它自己決定要不要重拉或直接塞進去 */
	onCreated: (item: ScheduleItem) => void;
};

type Draft = {
	title: string;
	/** 當地日期 "YYYY-MM-DD" */
	date: string;
	/** 從當地午夜起算的分鐘數，只會是 :00 / :30 */
	minutes: number;
	duration: RoomDuration;
	capacity: number;
	roomType: RoomTypeId;
};

type ErrorKey = "past" | "overlap" | "invalid" | "network";

const DURATIONS: readonly RoomDuration[] = [20, 40, 60];
const CAPACITIES: readonly number[] = [2, 3, 4];
/** 跟 packages/db 的 ROOM_TYPES 同一份；只有兩個值，直接寫在這裡 */
const ROOM_TYPES: readonly { id: RoomTypeId; from: LangCode; to: LangCode }[] = [
	{ id: 1, from: "en", to: "zh" },
	{ id: 2, from: "zh", to: "en" },
];
/** 開始時間只能選 :00 / :30，一天 48 個 */
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => i * 30);
const TITLE_MAX = 40;
const MINUTES_PER_DAY = 24 * 60;

/** 跟設定頁的 INPUT 同一串（那邊沒匯出；兩張表單長得一樣是刻意的） */
const INPUT =
	"w-full rounded-xl border border-ink-100 bg-surface px-4 py-3 font-semibold transition-colors placeholder:font-normal placeholder:text-ink-300 hover:border-primary-200 focus:border-primary-400";
const LABEL = "mb-1.5 block text-sm font-semibold text-ink-600";

/**
 * 開設聊天室的對話框：標題、日期、開始時間、時長、人數、語言方向，六個欄位對應 Rooms 主單。
 *
 * 用 Dialog 的受控模式而不是 trigger：每次打開都要重算預設值（下一個 :00 / :30、
 * 預設方向跟著個人資料的母語 → 學習語言），trigger 模式沒有「打開了」的回呼。
 *
 * 只在前端擋「時間已過」—— 其餘規則（重疊、列舉值）後端一定會再驗，前端照它回的錯誤碼顯示文案。
 * 送出中鎖按鈕；成功後 toast、把新房交給週曆、關閉。關閉不清草稿：下次打開會整個重算。
 */
export default function HostRoomDialog({ locale, dict, lang, closeLabel, cancelLabel, onCreated }: Props) {
	const h = dict.host;
	const { profile } = useProfile();
	const { toast } = useToast();
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState<Draft>(() => defaultDraft(null));
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<ErrorKey | null>(null);

	const today = toISODate(new Date());
	const now = new Date();
	const nowMinutes = now.getHours() * 60 + now.getMinutes();
	const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

	const openDialog = () => {
		setDraft(defaultDraft(profile ? { native: profile.nativeLang, learning: profile.learningLang } : null));
		setError(null);
		setOpen(true);
	};

	const submit = async (close: () => void) => {
		const start = parseLocalDate(draft.date);
		start.setMinutes(draft.minutes);
		if (start.getTime() <= Date.now()) {
			setError("past");
			return;
		}
		setPending(true);
		setError(null);
		const result = await createRoom({
			title: draft.title.trim(),
			startDate: start.toISOString(),
			durationMinutes: draft.duration,
			capacity: draft.capacity,
			roomType: draft.roomType,
		});
		setPending(false);
		if (!result.ok) {
			setError(result.reason);
			return;
		}
		toast(h.created);
		onCreated(result.item);
		close();
	};

	return (
		<>
			<button
				type="button"
				onClick={openDialog}
				className="flex items-center gap-2 rounded-full bg-primary-500 px-3.5 py-2 text-sm font-extrabold text-white transition-colors hover:bg-primary-600"
			>
				<Users aria-hidden="true" className="size-4" />
				{dict.hostRoom}
			</button>

			<Dialog
				open={open}
				onClose={() => setOpen(false)}
				title={h.title}
				description={h.hint}
				closeLabel={closeLabel}
				closeOnBackdrop={false}
				cancel={{ label: cancelLabel, disabled: pending }}
				confirm={{ label: h.create, disabled: pending, onClick: submit }}
			>
				<div className="flex flex-col gap-4">
					<div>
						<label htmlFor="room-title" className={LABEL}>
							{h.roomTitle}
							<span className="ml-1 font-normal text-ink-400">{h.optional}</span>
						</label>
						<input
							id="room-title"
							type="text"
							value={draft.title}
							maxLength={TITLE_MAX}
							placeholder={h.roomTitlePlaceholder}
							onChange={(event) => patch({ title: event.target.value })}
							className={INPUT}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label htmlFor="room-date" className={LABEL}>
								{h.date}
							</label>
							<input
								id="room-date"
								type="date"
								value={draft.date}
								min={today}
								onChange={(event) => event.target.value && patch({ date: event.target.value })}
								className={INPUT}
							/>
						</div>
						<div>
							<label htmlFor="room-time" className={LABEL}>
								{h.time}
							</label>
							<div className="relative">
								<select
									id="room-time"
									value={draft.minutes}
									onChange={(event) => patch({ minutes: Number(event.target.value) })}
									className={`${INPUT} appearance-none pr-10`}
								>
									{TIME_OPTIONS.map((m) => (
										// 今天的話，已經過去的時間點灰掉；其他天全開
										<option key={m} value={m} disabled={draft.date === today && m <= nowMinutes}>
											{formatTime(m, locale)}
										</option>
									))}
								</select>
								<ChevronDown
									aria-hidden="true"
									className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-primary-500"
								/>
							</div>
						</div>
					</div>

					<Segmented
						label={h.duration}
						value={draft.duration}
						onChange={(duration) => patch({ duration })}
						options={DURATIONS.map((n) => ({ value: n, label: fill(h.minutes, { n }) }))}
					/>
					<Segmented
						label={h.capacity}
						value={draft.capacity}
						onChange={(capacity) => patch({ capacity })}
						options={CAPACITIES.map((n) => ({ value: n, label: fill(h.people, { n }) }))}
					/>
					<Segmented
						label={h.type}
						value={draft.roomType}
						onChange={(roomType) => patch({ roomType })}
						options={ROOM_TYPES.map((t) => ({ value: t.id, label: `${lang[t.from]} → ${lang[t.to]}` }))}
					/>

					{error && (
						<p role="alert" className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-bold text-danger">
							{h[error]}
						</p>
					)}
				</div>
			</Dialog>
		</>
	);
}

/**
 * 預設值：今天、下一個至少 15 分鐘後的 :00 / :30（跨過午夜就變明天 00:00）、40 分鐘、2 人、
 * 方向 = 母語 → 學習語言（個人資料還沒載到就 zh → en）。
 */
function defaultDraft(me: { native: LangCode; learning: LangCode } | null): Draft {
	const now = new Date();
	let minutes = Math.ceil((now.getHours() * 60 + now.getMinutes() + 15) / 30) * 30;
	const date = new Date(now);
	if (minutes >= MINUTES_PER_DAY) {
		minutes -= MINUTES_PER_DAY;
		date.setDate(date.getDate() + 1);
	}
	const roomType = ROOM_TYPES.find((t) => me && t.from === me.native && t.to === me.learning)?.id ?? 2;
	return { title: "", date: toISODate(date), minutes, duration: 40, capacity: 2, roomType };
}

/** 幾顆並排的單選藥丸：時長 / 人數 / 方向都是三個以內的固定選項，比 select 少一次點擊 */
function Segmented<T extends string | number>({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: T;
	onChange: (value: T) => void;
	options: { value: T; label: ReactNode }[];
}) {
	return (
		<fieldset>
			<legend className={LABEL}>{label}</legend>
			<div role="radiogroup" className="flex gap-2">
				{options.map((option) => {
					const selected = option.value === value;
					return (
						<button
							key={String(option.value)}
							type="button"
							role="radio"
							aria-checked={selected}
							onClick={() => onChange(option.value)}
							className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-extrabold transition-colors ${
								selected
									? "border-primary-500 bg-primary-50 text-primary-600"
									: "border-ink-100 text-ink-500 hover:border-primary-200 hover:text-primary-600"
							}`}
						>
							{option.label}
						</button>
					);
				})}
			</div>
		</fieldset>
	);
}
