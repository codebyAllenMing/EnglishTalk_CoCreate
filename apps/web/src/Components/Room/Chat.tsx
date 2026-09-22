"use client";

import { MessageCircle, SendHorizontal, Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Avatar from "@/Components/UI/Avatar";
import Card from "@/Components/UI/Card";
import LangBadge from "@/Components/UI/LangBadge";
import type { Dictionary } from "@/dictionaries";
import type { LangCode } from "../Profile/profileData";
import { formatTime, toMinutes } from "../Profile/Schedule/week";
import type { ChatMessage } from "./roomData";
import { useRoom } from "./RoomProvider";
import SaveWordDialog from "./SaveWordDialog";

type Props = {
	locale: string;
	youLabel: string;
	dict: Dictionary["room"]["chat"];
	saveDict: Dictionary["room"]["saveWord"];
	closeLabel: string;
	cancelLabel: string;
};

/**
 * 房內聊天。
 *
 * **整個訊息泡泡是按鈕** —— 點了開 SaveWordDialog 從那句話存單字（使用者 2026-09-21
 * 定案：不畫星號、也不標記存過）。泡泡顏色跟著發言者的語言側：中文粉、英文紫。
 *
 * 一份清單只用一個受控的 Dialog（記「選中哪一則」），不是每則各掛一個。
 */
export default function Chat({ locale, youLabel, dict, saveDict, closeLabel, cancelLabel }: Props) {
	const { room, messages, sendMessage, chatStatus } = useRoom();
	const connected = chatStatus === "online";
	const [draft, setDraft] = useState("");
	const [pending, setPending] = useState<ChatMessage | null>(null);
	const listRef = useRef<HTMLDivElement>(null);

	// 新訊息進來捲到底 —— 只在長度變的時候，不然使用者往上翻舊訊息會被拉回來
	useEffect(() => {
		const el = listRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages.length]);

	const send = () => {
		sendMessage(draft);
		setDraft("");
	};

	const byId = new Map(room.participants.map((p) => [p.id, p]));

	return (
		<Card className="flex flex-col p-4">
			<h2 className="flex items-center gap-2 font-extrabold">
				<MessageCircle aria-hidden="true" className="size-5 text-primary-500" />
				{dict.title}
			</h2>
			<p className="mt-0.5 text-xs text-ink-500">{dict.hint}</p>

			<div ref={listRef} className="mt-3 flex max-h-80 flex-col gap-3 overflow-y-auto pr-1 xl:max-h-96">
				{messages.map((m) => {
					const author = byId.get(m.from);
					if (!author) return null;
					return (
						<Message
							key={m.id}
							message={m}
							name={author.me ? youLabel : author.name}
							avatar={author.avatar}
							lang={author.lang}
							time={formatTime(toMinutes(m.at), locale)}
							onPick={() => setPending(m)}
						/>
					);
				})}
			</div>

			<form
				className="mt-3 flex items-center gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					send();
				}}
			>
				<div className="relative flex-1">
					<input
						value={draft}
						placeholder={connected ? dict.placeholder : chatStatus === "error" ? dict.disconnected : dict.connecting}
						aria-label={dict.placeholder}
						disabled={!connected}
						onChange={(event) => setDraft(event.target.value)}
						onKeyDown={(event) => {
							// 注音選字的 Enter 不是送出（見 SettingsForm 興趣欄的同一個坑）
							if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) {
								event.preventDefault();
							}
						}}
						className="w-full rounded-xl border border-ink-100 py-2.5 pr-10 pl-4 text-sm transition-colors placeholder:text-ink-300 hover:border-primary-200 focus:border-primary-400"
					/>
					{/* emoji 選擇器還沒做 —— 純視覺 */}
					<Smile aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ink-300" />
				</div>
				<button
					type="submit"
					aria-label={dict.send}
					disabled={!draft.trim() || !connected}
					className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
				>
					<SendHorizontal aria-hidden="true" className="size-5" />
				</button>
			</form>

			<SaveWordDialog
				message={pending}
				lang={pending ? (byId.get(pending.from)?.lang ?? "en") : "en"}
				onClose={() => setPending(null)}
				dict={saveDict}
				closeLabel={closeLabel}
				cancelLabel={cancelLabel}
			/>
		</Card>
	);
}

const BUBBLE: Record<LangCode, string> = {
	zh: "bg-lang-zh/12 hover:bg-lang-zh/20",
	en: "bg-lang-en/12 hover:bg-lang-en/20",
};

function Message({
	message,
	name,
	avatar,
	lang,
	time,
	onPick,
}: {
	message: ChatMessage;
	name: string;
	avatar: string;
	lang: LangCode;
	time: string;
	onPick: () => void;
}) {
	return (
		<div className="flex items-start gap-2.5">
			<Avatar src={`avatar-${avatar}`} className="mt-1 w-9" sizes="36px" />
			<div className="min-w-0 flex-1">
				<p className="flex items-center gap-1.5 text-xs">
					<span className="font-extrabold">{name}</span>
					<LangBadge code={lang} className="size-4.5 text-[8px]" />
					<span className="text-ink-400">{time}</span>
				</p>
				<button
					type="button"
					onClick={onPick}
					className={`mt-1 max-w-full rounded-xl rounded-tl-sm px-3.5 py-2 text-left text-sm leading-relaxed transition-colors ${BUBBLE[lang]}`}
				>
					{message.text}
				</button>
			</div>
		</div>
	);
}
