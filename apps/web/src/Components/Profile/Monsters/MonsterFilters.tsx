// iOS Chrome 會在表單欄位塞 __gcruniqueid 屬性，dev 的 hydration 比對會報不一致（2026-09-23 手機測試撞到），
// 所以 SSR 會畫出來的 input / select / textarea 都加 suppressHydrationWarning；只壓屬性差異、跟程式無關。
import { ChevronDown, Search } from "lucide-react";
import type { Dictionary } from "@/dictionaries";
import type { LangCode, LevelCode } from "../profileData";
import type { MonsterFilter } from "./monstersData";

type Props = {
	filter: MonsterFilter;
	onChange: (next: MonsterFilter) => void;
	dict: Dictionary["profile"]["monsters"];
	langDict: Dictionary["profile"]["lang"];
	levelDict: Dictionary["profile"]["level"];
};

/**
 * 篩選列：語言、程度、只看線上、搜尋。
 *
 * ⚠️ 語言篩的是**對方的母語**，不是他正在學的 —— 那才是你能跟他練到的語言。
 *    下拉的 aria-label 因此寫「對方的母語」而不只是「語言」。
 *
 * 兩個下拉用原生 `<select>`：手機會叫出系統的選單、鍵盤操作與螢幕閱讀器都是現成的。
 * 自己刻的 dropdown 要補一整套 roving focus 才能追平，設計稿上的差別只有一顆箭頭 ——
 * 用 appearance-none 把原生箭頭關掉、自己畫一顆疊上去就對得上。
 */
export default function MonsterFilters({ filter, onChange, dict, langDict, levelDict }: Props) {
	const set = (patch: Partial<MonsterFilter>) => onChange({ ...filter, ...patch });

	return (
		<div className="flex flex-wrap items-center gap-2 sm:gap-3">
			<Select
				label={dict.languageLabel}
				value={filter.language}
				onChange={(value) => set({ language: value as LangCode | "all" })}
				allLabel={dict.allLanguages}
				options={Object.entries(langDict)}
			/>

			<Select
				label={dict.levelLabel}
				value={filter.level}
				onChange={(value) => set({ level: value as LevelCode | "all" })}
				allLabel={dict.allLevels}
				options={Object.entries(levelDict)}
			/>

			{/*
			 * role="switch" 而不是 checkbox：它不是表單送出的一個欄位，
			 * 是一個立刻生效的開關，語意上就是 switch。
			 */}
			<button
				type="button"
				role="switch"
				aria-checked={filter.onlineOnly}
				onClick={() => set({ onlineOnly: !filter.onlineOnly })}
				className="flex shrink-0 items-center gap-2 text-sm font-extrabold"
			>
				<span
					className={`relative h-6 w-11 rounded-full transition-colors ${
						filter.onlineOnly ? "bg-primary-500" : "bg-ink-200"
					}`}
				>
					<span
						className={`absolute top-1 size-4 rounded-full bg-white transition-all ${
							filter.onlineOnly ? "left-6" : "left-1"
						}`}
					/>
				</span>
				{dict.onlineNow}
			</button>

			<div className="relative min-w-40 flex-1 sm:max-w-64">
				<input
					suppressHydrationWarning
					type="search"
					value={filter.query}
					onChange={(event) => set({ query: event.target.value })}
					placeholder={dict.search}
					aria-label={dict.searchLabel}
					className="w-full rounded-full border-2 border-ink-100 bg-surface py-2 pr-10 pl-4 text-sm transition-colors placeholder:text-ink-300 hover:border-primary-200 focus:border-primary-400"
				/>
				<Search
					aria-hidden="true"
					className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-300"
				/>
			</div>
		</div>
	);
}

function Select({
	label,
	value,
	onChange,
	allLabel,
	options,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	allLabel: string;
	options: [string, string][];
}) {
	return (
		<div className="relative shrink-0">
			<select
				suppressHydrationWarning
				value={value}
				aria-label={label}
				onChange={(event) => onChange(event.target.value)}
				className="appearance-none rounded-full border-2 border-ink-100 bg-surface py-2 pr-9 pl-4 text-sm font-extrabold transition-colors hover:border-primary-200 focus:border-primary-400"
			>
				<option value="all">{allLabel}</option>
				{options.map(([code, text]) => (
					<option key={code} value={code}>
						{text}
					</option>
				))}
			</select>
			<ChevronDown
				aria-hidden="true"
				className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-primary-500"
			/>
		</div>
	);
}
