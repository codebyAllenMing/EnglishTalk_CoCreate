"use client";

import { Lock, Pencil } from "lucide-react";
import { useId, useState } from "react";
import Avatar from "@/Components/UI/Avatar";
import Dialog from "@/Components/UI/Dialog";
import LangBadge from "@/Components/UI/LangBadge";
import type { Dictionary } from "@/dictionaries";
import type { LangCode } from "./profileData";

/** 設計稿的計數器寫 6 / 20 */
const NAME_MAX = 20;

type Props = {
	name: string;
	avatar: string;
	native: LangCode;
	learning: LangCode;
	/** 觸發鈕的無障礙名稱，同時也是對話框標題 */
	title: string;
	closeLabel: string;
	cancelLabel: string;
	dict: Dictionary["profile"]["edit"];
	langDict: Dictionary["profile"]["lang"];
};

/**
 * 編輯個人資料的對話框（設計稿 `assets/design/個人主頁-編輯.png`）。
 *
 * 頭像 + 名字 + 兩個唯讀的語言列。**沒有程度與自我介紹** —— 設計稿就只有這幾項，
 * 沒有自己補。
 *
 * ## 為什麼整個對話框是 client、卡片不是
 *
 * 名字輸入框與字數計數器需要 state，所以這裡必然是 Client Component。
 * 但把它獨立成一個檔案，`ProfileCard` 就仍然是 Server Component ——
 * 進 client bundle 的只有這個對話框，不是整張卡。
 *
 * ## 兩個唯讀的語言
 *
 * 母語與學習中的語言在設計稿上是鎖住的（「Can't change 🔒」）。那是產品規則不是
 * 偷懶：這兩個值決定了配對與可進入的房間，改掉等於換一個人，累積的評價與紀錄
 * 就對不上了。要換得走另外的流程。
 *
 * ⚠️ **儲存目前是 disabled** —— 沒有 API，跟「開設聊天室」「建立時段」同樣處理。
 *    輸入框與計數器是真的能用的，那是這一輪要做的 UI；送出等後端。
 */
export default function EditProfileDialog({
	name,
	avatar,
	native,
	learning,
	title,
	closeLabel,
	cancelLabel,
	dict,
	langDict,
}: Props) {
	const [draft, setDraft] = useState(name);
	// ⚠️ 這張卡在桌機與手機版型各 render 一次，id 寫死會讓 label 指到同一個輸入框
	const nameId = useId();

	return (
		<Dialog
			trigger={<Pencil aria-hidden="true" className="size-3.5" />}
			triggerLabel={title}
			triggerClassName="absolute top-4 right-4 rounded-full border border-ink-100 bg-primary-50 p-2 text-primary-500 transition-colors hover:bg-primary-100"
			title={title}
			description={dict.hint}
			closeLabel={closeLabel}
			className="max-w-lg"
			// 填到一半誤觸遮罩就丟掉輸入，這正是這個 prop 的用途
			closeOnBackdrop={false}
			// 關閉的四條路（Esc / ✕ / 取消 / 之後的儲存）都會還原草稿。
			// 沒有持久化，所以留著半截的名字反而會誤導
			onClose={() => setDraft(name)}
			cancel={{ label: cancelLabel }}
			confirm={{ label: dict.save, disabled: true }}
		>
			<div className="flex flex-col gap-4">
				<div className="relative mx-auto w-40">
					<Avatar src={avatar} className="w-full" sizes="160px" />
					{/* 換頭像也還沒有 API。位置貼著圓形底的右下 45 度，
					    百分比定位才跟得上 Avatar 的等比縮放 */}
					<button
						type="button"
						aria-label={dict.avatar}
						className="absolute right-[7%] bottom-[9%] rounded-full bg-primary-50 p-2 text-primary-500 shadow-[0_2px_8px_rgba(13,24,82,.12)] transition-colors hover:bg-primary-100"
					>
						<Pencil aria-hidden="true" className="size-3.5" />
					</button>
				</div>

				<div>
					<label htmlFor={nameId} className="text-sm font-semibold text-ink-600">
						{dict.name}
					</label>
					<input
						id={nameId}
						value={draft}
						maxLength={NAME_MAX}
						onChange={(event) => setDraft(event.target.value)}
						className="mt-1.5 w-full rounded-xl border border-ink-100 px-4 py-3 font-semibold transition-colors hover:border-primary-200 focus:border-primary-400"
					/>
					<p className="mt-1 text-right text-xs text-ink-300">
						{draft.length} / {NAME_MAX}
					</p>
				</div>

				<LockedRow
					label={dict.native}
					code={native}
					value={langDict[native]}
					locked={dict.locked}
				/>
				<LockedRow
					label={dict.learning}
					code={learning}
					value={langDict[learning]}
					locked={dict.locked}
				/>
			</div>
		</Dialog>
	);
}

/**
 * 唯讀的語言列。用 <p> 而不是 disabled 的 <input> —— 它不是「暫時不能填的欄位」，
 * 是一個不屬於這張表單的既定事實，右邊的鎖已經把原因說完了。
 */
function LockedRow({
	label,
	code,
	value,
	locked,
}: {
	label: string;
	code: LangCode;
	value: string;
	locked: string;
}) {
	return (
		<div className="flex items-center gap-3 rounded-xl bg-app px-4 py-3">
			<div className="min-w-0 flex-1">
				<p className="text-sm text-ink-500">{label}</p>
				<p className="mt-1.5 flex items-center gap-2 font-extrabold">
					<LangBadge code={code} className="size-7 text-[11px]" />
					{value}
				</p>
			</div>
			<span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-ink-100 px-2.5 py-1.5 text-xs text-ink-400">
				{locked}
				<Lock aria-hidden="true" className="size-3.5" />
			</span>
		</div>
	);
}
