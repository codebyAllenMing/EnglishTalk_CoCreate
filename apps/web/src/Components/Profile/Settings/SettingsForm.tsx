"use client";

// iOS Chrome 會在表單欄位塞 __gcruniqueid 屬性，dev 的 hydration 比對會報不一致（2026-09-23 手機測試撞到），
// 所以 SSR 會畫出來的 input / select / textarea 都加 suppressHydrationWarning；只壓屬性差異、跟程式無關。
import { Check, ChevronDown, Eye, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { useSession } from "@/auth/SessionProvider";
import Avatar from "@/Components/UI/Avatar";
import Card from "@/Components/UI/Card";
import CountryFlag from "@/Components/UI/CountryFlag";
import Dialog from "@/Components/UI/Dialog";
import { useToast } from "@/Components/UI/ToastProvider";
import type { Dictionary } from "@/dictionaries";
import { updateProfile, type Profile } from "@/profile/client";
import { useProfile } from "@/profile/ProfileProvider";
import type { AvatarChoice } from "../avatarChoices";
import MonsterDetails from "../Monsters/MonsterDetails";
import { fill, type Monster } from "../Monsters/monstersData";
import { LANG_FLAG, type CountryCode, type GenderCode, type LangCode, type LevelCode } from "../profileData";

const NAME_MAX = 20;
const BIO_MAX = 150;
const INTEREST_MAX = 20;
const INTERESTS_MAX = 10;
/** 只有兩個（使用者 2026-09-21 決定） */
const COUNTRIES: readonly CountryCode[] = ["TW", "US"];

export type ProfileDraft = {
	/** 挑選清單的 id（allen），不是檔名 */
	avatar: string;
	name: string;
	country: CountryCode;
	gender: GenderCode;
	native: LangCode;
	nativeLevel: LevelCode;
	learning: LangCode;
	learningLevel: LevelCode;
	/** 自由輸入的字串（使用者 2026-09-21：「讓他自己填」），字典那十二個只是建議 */
	interests: string[];
	bio: string;
};

type Props = {
	locale: string;
	choices: readonly AvatarChoice[];
	dict: Dictionary["profile"]["settings"];
	langDict: Dictionary["profile"]["lang"];
	levelDict: Dictionary["profile"]["level"];
	/** 預覽用的是 Find Monsters 的詳情元件，字典也跟它借 */
	monstersDict: Dictionary["profile"]["monsters"];
	closeLabel: string;
	cancelLabel: string;
};

/**
 * 個人設定的表單：怪獸方格 + 基本資料 + 底部三顆按鈕。
 *
 * ## 母語與學習語言互斥
 *
 * 產品只有兩種語言，母語一選定學習語言就只剩另一個。改了其中一個而撞到另一個時
 * 自動把另一個翻過去，不做「不能選」的灰階 —— 兩個都只有兩個選項，灰掉一個
 * 等於下拉裡只剩一項，那還不如直接翻。
 *
 * ## 母語可以改
 *
 * 前一版對話框的設計稿是鎖住的（Can't change 🔒），這版是可改的下拉，
 * 使用者 2026-09-21 確認以這版為準。
 *
 * ## 預覽 = Find Monsters 的詳情
 *
 * 「其他怪獸看到你會是這個樣子」—— 最誠實的預覽就是把表單目前的值餵進
 * 別人點你時看到的那個 MonsterDetails。房間人數與下次有空不在這張表單上，
 * 先用假值。
 *
 * ## 資料流
 *
 * 初始值從 ProfileProvider 來（client 載入，靜態 HTML 沒有資料），載到之前畫骨架。
 * 外層等 profile 到了才掛 Form，並用 email 當 key —— Form 的 state 用 useState(initial)
 * 只讀一次，換人（登出再登入別的帳號）時整個重掛才會拿到新值。
 * 儲存打 PUT /api/me/profile，成功後把回傳值塞回 provider、刷新 session（name 在 cookie 快取裡）、
 * 丟一則「已儲存」的 toast、回 /home（toast 掛在 layout，跨頁還在）。
 */
export default function SettingsForm({ dict, ...rest }: Props) {
	const { profile } = useProfile();
	if (!profile) return <FormSkeleton />;
	return <Form key={profile.email} initial={toDraft(profile)} dict={dict} {...rest} />;
}

function toDraft(p: Profile): ProfileDraft {
	return {
		avatar: p.avatar,
		name: p.name,
		country: p.country,
		gender: p.gender,
		native: p.nativeLang,
		nativeLevel: p.nativeLevel,
		learning: p.learningLang,
		learningLevel: p.learningLevel,
		interests: p.interests,
		bio: p.bio,
	};
}

function FormSkeleton() {
	return (
		<>
			<Card className="p-4 sm:p-5">
				<div aria-hidden="true" className="h-6 w-40 animate-pulse rounded-md bg-ink-100" />
				<div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-11">
					{Array.from({ length: 11 }, (_, i) => (
						<div key={i} aria-hidden="true" className="aspect-square animate-pulse rounded-2xl bg-ink-100" />
					))}
				</div>
			</Card>
			<Card className="p-4 sm:p-5">
				<div aria-hidden="true" className="h-6 w-32 animate-pulse rounded-md bg-ink-100" />
				<div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-6">
					{Array.from({ length: 6 }, (_, i) => (
						<div key={i} aria-hidden="true" className="h-12 animate-pulse rounded-xl bg-ink-100 md:col-span-3" />
					))}
				</div>
			</Card>
		</>
	);
}

function Form({
	locale,
	initial,
	choices,
	dict,
	langDict,
	levelDict,
	monstersDict,
	closeLabel,
	cancelLabel,
}: Props & { initial: ProfileDraft }) {
	const router = useRouter();
	const session = useSession();
	const { setProfile } = useProfile();
	const { toast } = useToast();
	const [draft, setDraft] = useState(initial);
	const [pending, setPending] = useState(false);
	const [saveError, setSaveError] = useState(false);
	const id = useId();

	const canSave = draft.name.trim().length > 0 && !pending;
	const save = async () => {
		setPending(true);
		setSaveError(false);
		const result = await updateProfile({
			name: draft.name.trim(),
			avatar: draft.avatar,
			nativeLang: draft.native,
			nativeLevel: draft.nativeLevel,
			learningLang: draft.learning,
			learningLevel: draft.learningLevel,
			country: draft.country,
			gender: draft.gender,
			interests: draft.interests,
			bio: draft.bio.trim(),
		});
		if (!result.ok) {
			setSaveError(true);
			setPending(false);
			return;
		}
		setProfile(result.profile);
		// name 也在 better-auth 的 cookie 快取裡，不刷新的話帳號選單會顯示舊名字
		await session.refresh();
		toast(dict.saved);
		router.push(`/${locale}/home`);
	};
	const set = (patch: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...patch }));

	const langs = Object.keys(langDict) as LangCode[];
	const other = (code: LangCode) => langs.find((l) => l !== code) ?? code;
	const setNative = (code: LangCode) =>
		setDraft((d) => ({ ...d, native: code, learning: d.learning === code ? other(code) : d.learning }));
	const setLearning = (code: LangCode) =>
		setDraft((d) => ({ ...d, learning: code, native: d.native === code ? other(code) : d.native }));

	// 國家名稱交給 Intl：zh-TW 得到「台灣」「美國」，en 得到 Taiwan / United States，
	// 不用在字典裡維護第二份翻譯
	const regionNames = new Intl.DisplayNames([locale], { type: "region" });

	const [pendingInterest, setPendingInterest] = useState("");
	const hasInterest = (value: string) =>
		draft.interests.some((i) => i.toLowerCase() === value.toLowerCase());
	const addInterest = () => {
		const value = pendingInterest.trim();
		// 重複的直接清掉輸入框不報錯 —— 使用者的意圖已經達成（那個標籤在裡面）
		if (value && !hasInterest(value) && draft.interests.length < INTERESTS_MAX) {
			set({ interests: [...draft.interests, value] });
		}
		setPendingInterest("");
	};
	const interestSuggestions = Object.values(dict.interestOptions).filter((label) => !hasInterest(label));

	// 預覽當成自己正在線上（你正在看這頁）
	const preview: Monster = {
		id: "me",
		avatar: draft.avatar,
		name: draft.name || initial.name,
		native: draft.native,
		learning: draft.learning,
		level: draft.learningLevel,
		presence: "active",
		lastSeenDate: null,
		bio: draft.bio,
	};

	return (
		<>
			<Card className="p-4 sm:p-5">
				<SectionTitle title={dict.monster.title} hint={dict.monster.hint} />
				{/* 十一隻在設計稿的八欄裡會折成兩排，用 grid 折行而不是橫向捲動 ——
				    桌機上要使用者橫著捲一排頭像很彆扭，手機四欄三排也一眼看得完 */}
				<div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8 2xl:grid-cols-11">
					{choices.map((choice) => {
						const selected = choice.id === draft.avatar;
						return (
							<button
								key={choice.id}
								type="button"
								aria-label={choice.name}
								aria-pressed={selected}
								onClick={() => set({ avatar: choice.id })}
								className={`relative rounded-2xl border-2 p-2 transition-colors ${
									selected
										? "border-primary-400 bg-primary-50/60"
										: "border-ink-100 bg-surface hover:border-primary-200 hover:bg-primary-50/40"
								}`}
							>
								{selected && (
									<span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-primary-500 text-white shadow-[0_2px_6px_rgba(105,72,220,.4)]">
										<Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
									</span>
								)}
								<Avatar
									src={`avatar-${choice.id}`}
									className="w-full"
									sizes="(min-width: 640px) 120px, 25vw"
									circle={false}
								/>
							</button>
						);
					})}
				</div>
			</Card>

			<Card className="p-4 sm:p-5">
				<SectionTitle title={dict.basic.title} hint={dict.basic.hint} />

				<div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-6">
					<Field
						id={`${id}-name`}
						label={dict.displayName}
						trailing={
							<Counter value={draft.name.length} max={NAME_MAX} />
						}
						className="md:col-span-2"
					>
						<input
							suppressHydrationWarning
							id={`${id}-name`}
							value={draft.name}
							maxLength={NAME_MAX}
							onChange={(event) => set({ name: event.target.value })}
							className={INPUT}
						/>
					</Field>

					<Field id={`${id}-country`} label={dict.country} className="md:col-span-2">
						<Select
							id={`${id}-country`}
							value={draft.country}
							onChange={(value) => set({ country: value as CountryCode })}
							options={COUNTRIES.map((code) => [code, regionNames.of(code) ?? code])}
							leading={<CountryFlag code={draft.country} />}
						/>
					</Field>

					<Field
						id={`${id}-gender`}
						label={dict.gender}
						optional={dict.optional}
						className="md:col-span-2"
					>
						<Select
							id={`${id}-gender`}
							value={draft.gender}
							onChange={(value) => set({ gender: value as GenderCode })}
							options={Object.entries(dict.genderOptions)}
						/>
					</Field>

					<Field id={`${id}-native`} label={dict.native} className="md:col-span-3">
						<Select
							id={`${id}-native`}
							value={draft.native}
							onChange={(value) => setNative(value as LangCode)}
							options={Object.entries(langDict)}
							leading={<CountryFlag code={LANG_FLAG[draft.native]} />}
						/>
					</Field>

					<Field id={`${id}-native-level`} label={dict.nativeLevel} className="md:col-span-3">
						<Select
							id={`${id}-native-level`}
							value={draft.nativeLevel}
							onChange={(value) => set({ nativeLevel: value as LevelCode })}
							options={Object.entries(levelDict)}
						/>
					</Field>

					<Field id={`${id}-learning`} label={dict.learning} className="md:col-span-3">
						<Select
							id={`${id}-learning`}
							value={draft.learning}
							onChange={(value) => setLearning(value as LangCode)}
							options={Object.entries(langDict)}
							leading={<CountryFlag code={LANG_FLAG[draft.learning]} />}
						/>
					</Field>

					<Field
						id={`${id}-learning-level`}
						label={dict.learningLevel}
						className="md:col-span-3"
					>
						<Select
							id={`${id}-learning-level`}
							value={draft.learningLevel}
							onChange={(value) => set({ learningLevel: value as LevelCode })}
							options={Object.entries(levelDict)}
						/>
					</Field>

					<Field
						id={`${id}-interests`}
						label={dict.interests}
						optional={dict.optional}
						className="md:col-span-6"
					>
						{/*
						 * 標籤 + 自由輸入。Enter 或 ＋ 新增；<datalist> 提供字典裡的十二個當建議，
						 * 原生的、零 JS，打字時會跳出來，但**不限制**只能選它們。
						 * 設計稿畫的是下拉，使用者 2026-09-21 改成「讓他自己填」。
						 *
						 * 輸入框自己的 focus ring 關掉，改由外框的 focus-within 顯示 ——
						 * 整個框才是「這個欄位」，ring 套在框裡的小輸入框上會像跑版。
						 */}
						<div className="flex flex-wrap items-center gap-2 rounded-xl border border-ink-100 p-2 transition-colors focus-within:border-primary-400 hover:border-primary-200">
							{draft.interests.map((label) => (
								<span
									key={label}
									className="flex items-center gap-1.5 rounded-lg bg-primary-50 py-1.5 pr-1.5 pl-3 text-sm font-semibold text-primary-600"
								>
									{label}
									<button
										type="button"
										aria-label={fill(dict.removeInterest, { name: label })}
										onClick={() =>
											set({ interests: draft.interests.filter((i) => i !== label) })
										}
										className="rounded-md p-0.5 transition-colors hover:bg-primary-100"
									>
										<X aria-hidden="true" className="size-3.5" />
									</button>
								</span>
							))}
							{draft.interests.length < INTERESTS_MAX && (
								<span className="flex items-center gap-1">
									{/*
									 * 輸入框跟著字數變寬：一個隱形的 span 鏡射目前的值（空的時候鏡射
									 * placeholder），跟 input 疊在同一個 grid 格子裡 —— 格子寬度由較寬的
									 * 那個決定，input 再 w-full 填滿。這是 CSS 唯一能做到「寬度 = 內容」
									 * 的方法，input 本身量不出自己的文字寬。
									 * 鏡射的 span 要跟 input 同字體、同 padding，寬度才對得上。
									 */}
									{/* 淡底讓它讀起來是「可以打字的地方」，不然跟標籤並排像一段漏掉樣式的文字 */}
									<span className="inline-grid rounded-lg bg-app transition-colors focus-within:bg-primary-50">
										<span
											aria-hidden="true"
											className="invisible col-start-1 row-start-1 min-w-24 py-1.5 pr-3 pl-3 text-sm font-semibold whitespace-pre"
										>
											{pendingInterest || dict.addInterest}
										</span>
										<input
											suppressHydrationWarning
											id={`${id}-interests`}
											list={`${id}-interest-options`}
											value={pendingInterest}
											maxLength={INTEREST_MAX}
											enterKeyHint="done"
											placeholder={dict.addInterest}
											onChange={(event) => setPendingInterest(event.target.value)}
											onKeyDown={(event) => {
												if (event.key !== "Enter") return;
												// ⚠️ 注音 / 拼音等 IME 用 Enter 確認選字，那一下也是 keydown Enter，
												//    但字還沒進 value（isComposing 為 true）。這時加標籤會把半截的
												//    注音符號加進去。Safari 在 compositionend 之後才發 keydown、
												//    isComposing 已經是 false，只剩 keyCode 229 能認，兩個都要看
												if (event.nativeEvent.isComposing || event.keyCode === 229) return;
												// 不讓 Enter 送出表單 —— 這一頁的 Enter 是「加標籤」
												event.preventDefault();
												addInterest();
											}}
											// 那個黑色 ▼ 是 Chrome 替有 list 屬性的 input 畫的原生 datalist 按鈕，
											// 不能換色也不能移位。藏掉 —— 建議清單打字時照樣會跳出來，＋ 才是新增鈕
											className="col-start-1 row-start-1 w-full bg-transparent py-1.5 pr-3 pl-3 text-sm font-semibold placeholder:font-normal placeholder:text-ink-300 focus:outline-none [&::-webkit-calendar-picker-indicator]:hidden"
										/>
									</span>
									<datalist id={`${id}-interest-options`}>
										{interestSuggestions.map((label) => (
											<option key={label} value={label} />
										))}
									</datalist>
									<button
										type="button"
										aria-label={dict.addInterestButton}
										disabled={!pendingInterest.trim()}
										onClick={addInterest}
										className="rounded-md p-1 text-primary-500 transition-colors hover:bg-primary-50 disabled:opacity-40"
									>
										<Plus aria-hidden="true" className="size-4" />
									</button>
								</span>
							)}
						</div>
					</Field>

					<Field
						id={`${id}-bio`}
						label={dict.bio}
						optional={dict.optional}
						className="md:col-span-6"
					>
						<div className="relative">
							<textarea
								suppressHydrationWarning
								id={`${id}-bio`}
								rows={3}
								value={draft.bio}
								maxLength={BIO_MAX}
								placeholder={dict.bioPlaceholder}
								onChange={(event) => set({ bio: event.target.value })}
								className={`${INPUT} resize-none pb-7`}
							/>
							<span className="pointer-events-none absolute right-3.5 bottom-2.5">
								<Counter value={draft.bio.length} max={BIO_MAX} />
							</span>
						</div>
					</Field>
				</div>
			</Card>

			{/* 放在按鈕列上方：錯誤要在按下儲存的視線範圍內，擺在頁尾會以為沒反應 */}
			{saveError && (
				<p role="alert" className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-bold text-danger">
					{dict.saveFailed}
				</p>
			)}

			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<Link
					href={`/${locale}/home`}
					className="rounded-xl bg-ink-100/70 px-6 py-3 text-center font-extrabold text-ink-600 transition-colors hover:bg-ink-100"
				>
					{cancelLabel}
				</Link>
				<div className="flex flex-col gap-3 sm:ml-auto sm:flex-row">
					<Dialog
						trigger={
							<>
								<Eye aria-hidden="true" className="size-4" />
								{dict.preview}
							</>
						}
						triggerClassName="flex items-center justify-center gap-2 rounded-xl border-2 border-primary-200 px-6 py-3 font-extrabold text-primary-600 transition-colors hover:border-primary-400 hover:bg-primary-50"
						title={dict.preview}
						description={dict.previewHint}
						closeLabel={closeLabel}
						className="max-w-sm"
					>
						<MonsterDetails
							monster={preview}
							locale={locale}
							dict={monstersDict}
							levelDict={levelDict}
						/>
					</Dialog>
					<button
						type="button"
						disabled={!canSave}
						onClick={save}
						className="rounded-xl bg-primary-500 px-6 py-3 font-extrabold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{dict.save}
					</button>
				</div>
			</div>

		</>
	);
}

const INPUT =
	"w-full rounded-xl border border-ink-100 bg-surface px-4 py-3 font-semibold transition-colors placeholder:font-normal placeholder:text-ink-300 hover:border-primary-200 focus:border-primary-400";

function SectionTitle({ title, hint }: { title: string; hint: string }) {
	return (
		<div>
			<h2 className="text-lg font-extrabold">{title}</h2>
			<p className="mt-0.5 text-sm text-ink-500">{hint}</p>
		</div>
	);
}

function Field({
	id,
	label,
	optional,
	trailing,
	className = "",
	children,
}: {
	id: string;
	label: string;
	optional?: string;
	trailing?: ReactNode;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div className={className}>
			<div className="mb-1.5 flex items-baseline justify-between gap-3">
				<label htmlFor={id} className="text-sm font-semibold text-ink-600">
					{label}
					{optional && <span className="ml-1 font-normal text-ink-400">{optional}</span>}
				</label>
				{trailing}
			</div>
			{children}
		</div>
	);
}

function Counter({ value, max }: { value: number; max: number }) {
	return (
		<span className="text-xs text-ink-300 tabular-nums">
			{value}/{max}
		</span>
	);
}

/**
 * 原生 <select> + 自己畫的箭頭，跟 MonsterFilters 同一套做法。
 * leading 放在欄位左側（語言徽章、國旗），反映目前的值 —— option 裡塞不了圖示，
 * 這是原生 select 能做到的極限，也夠了。
 */
function Select({
	id,
	value,
	onChange,
	options,
	leading,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	options: [string, string][];
	leading?: ReactNode;
}) {
	return (
		<div className="relative">
			{leading && (
				<span className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2">
					{leading}
				</span>
			)}
			<select
				suppressHydrationWarning
				id={id}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className={`${INPUT} appearance-none pr-10 ${leading ? "pl-13" : ""}`}
			>
				{options.map(([code, text]) => (
					<option key={code} value={code}>
						{text}
					</option>
				))}
			</select>
			<ChevronDown
				aria-hidden="true"
				className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-primary-500"
			/>
		</div>
	);
}
