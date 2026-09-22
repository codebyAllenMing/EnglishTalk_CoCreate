"use client";

import { useId, useState } from "react";
import Dialog from "@/Components/UI/Dialog";
import type { Dictionary } from "@/dictionaries";
import { WORD_POS, type WordPosId } from "@/words/client";
import type { LangCode } from "../Profile/profileData";
import type { ChatMessage } from "./roomData";
import { useRoom } from "./RoomProvider";

type Props = {
	/** null = 關著 */
	message: ChatMessage | null;
	lang: LangCode;
	onClose: () => void;
	dict: Dictionary["room"]["saveWord"];
	closeLabel: string;
	cancelLabel: string;
};

/**
 * 從一則訊息存單字（方案 B，使用者 2026-09-21 定案）：顯示原句，使用者自己填
 * 單字（必填）、詞性、意思（選填）。原句就是例句，直接存。
 *
 * 存進 DB（POST /api/rooms/:code/words）才關框；同一個字已經在字典裡 server 回 duplicate，
 * 框不關、顯示訊息讓他改。
 *
 * 這個對話框是之後 LLM（盤點 B6）的前置 —— LLM 進來只是把欄位**預填**、
 * 使用者按確認，同一個對話框不用重做。
 *
 * 表單用 message.id 當 key：換一則訊息就換一份全新的 state，不必手動清欄位。
 */
export default function SaveWordDialog({ message, lang, onClose, dict, closeLabel, cancelLabel }: Props) {
	return (
		<Dialog
			open={message !== null}
			onClose={onClose}
			title={dict.title}
			description={dict.hint}
			closeLabel={closeLabel}
			closeOnBackdrop={false}
			className="max-w-md"
			// 底部按鈕在 Form 裡（它要讀表單 state），這裡給空 footer 免得 Dialog 畫預設的
			footer={<span />}
		>
			{message && (
				<Form key={message.id} message={message} lang={lang} dict={dict} cancelLabel={cancelLabel} onDone={onClose} />
			)}
		</Dialog>
	);
}

type ErrorKey = "duplicate" | "failed";

function Form({
	message,
	lang,
	dict,
	cancelLabel,
	onDone,
}: {
	message: ChatMessage;
	lang: LangCode;
	dict: Dictionary["room"]["saveWord"];
	cancelLabel: string;
	onDone: () => void;
}) {
	const { saveWord } = useRoom();
	const id = useId();
	const [word, setWord] = useState("");
	const [pos, setPos] = useState<WordPosId>(1);
	const [meaning, setMeaning] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<ErrorKey | null>(null);
	const canSave = word.trim().length > 0 && !saving;

	const submit = async () => {
		if (!canSave) return;
		setSaving(true);
		setError(null);
		const result = await saveWord({ word: word.trim(), pos, meaning: meaning.trim(), example: message.text, lang });
		setSaving(false);
		if (result.ok) onDone();
		else setError(result.reason === "duplicate" ? "duplicate" : "failed");
	};

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={(event) => {
				event.preventDefault();
				void submit();
			}}
		>
			<div>
				<p className="text-sm font-semibold text-ink-600">{dict.from}</p>
				<p className="mt-1.5 rounded-xl bg-app px-3.5 py-2.5 text-sm leading-relaxed">{message.text}</p>
			</div>

			<div>
				<label htmlFor={`${id}-word`} className="text-sm font-semibold text-ink-600">
					{dict.word}
				</label>
				<input
					id={`${id}-word`}
					value={word}
					autoFocus
					onChange={(event) => {
						setWord(event.target.value);
						setError(null);
					}}
					className={INPUT}
				/>
			</div>

			<div className="grid grid-cols-[8rem_1fr] gap-3">
				<div>
					<label htmlFor={`${id}-pos`} className="text-sm font-semibold text-ink-600">
						{dict.pos}
					</label>
					<select
						id={`${id}-pos`}
						value={pos}
						onChange={(event) => setPos(Number(event.target.value) as WordPosId)}
						className={INPUT}
					>
						{WORD_POS.map((p) => (
							<option key={p.id} value={p.id}>
								{dict.posOptions[p.code]}
							</option>
						))}
					</select>
				</div>
				<div>
					<label htmlFor={`${id}-meaning`} className="text-sm font-semibold text-ink-600">
						{dict.meaning}
					</label>
					<input
						id={`${id}-meaning`}
						value={meaning}
						placeholder={dict.meaningPlaceholder}
						onChange={(event) => setMeaning(event.target.value)}
						className={INPUT}
					/>
				</div>
			</div>

			{error && (
				<p role="alert" className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-bold text-danger">
					{dict[error]}
				</p>
			)}

			<div className="flex gap-3">
				<button
					type="button"
					onClick={onDone}
					className="flex-1 rounded-xl bg-primary-50 px-5 py-3 text-sm font-extrabold text-primary-600 transition-colors hover:bg-primary-100"
				>
					{cancelLabel}
				</button>
				<button
					type="submit"
					disabled={!canSave}
					className="flex-1 rounded-xl bg-primary-500 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{dict.save}
				</button>
			</div>
		</form>
	);
}

const INPUT =
	"mt-1.5 w-full rounded-xl border border-ink-100 bg-surface px-3.5 py-2.5 text-sm font-semibold transition-colors placeholder:font-normal placeholder:text-ink-300 hover:border-primary-200 focus:border-primary-400";
