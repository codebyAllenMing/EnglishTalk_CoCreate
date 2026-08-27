"use client";

import { Check, LayoutGrid, Lock, Pencil } from "lucide-react";
import { useState, type ReactNode } from "react";
import Avatar from "@/Components/UI/Avatar";
import Dialog from "@/Components/UI/Dialog";
import type { Dictionary } from "@/dictionaries";
import type { AvatarChoice } from "./avatarChoices";

type Tab = "all" | "owned" | "locked";

type Props = {
	/** 目前使用的頭像 id */
	value: string;
	onChange: (id: string) => void;
	choices: readonly AvatarChoice[];
	closeLabel: string;
	cancelLabel: string;
	dict: Dictionary["profile"]["picker"];
};

/**
 * 選擇怪獸的對話框（設計稿 `assets/design/個人主頁-選擇怪獸圖.png`），
 * 由編輯個人資料裡頭像右下那顆筆打開 —— 所以這是**開在對話框裡的對話框**。
 *
 * 原生 `<dialog>` 撐得住這件事：`showModal()` 會把元素提升到 top layer，
 * 不受外層 `overflow-hidden` 裁切，Esc 也只關最上面那一個。外層的編輯對話框
 * 已經是 `closeOnBackdrop={false}`，內層冒泡上去的點擊不會誤關它。
 *
 * ⚠️ **選取狀態用「null 代表沒動過」而不是直接複製 value。**
 *    按下「使用這隻怪獸」的順序是 onChange → close，而 close 觸發的 onClose
 *    拿到的是**這一輪 render 的 value**（還是舊值）。直接 `setPicked(value)`
 *    會把剛選好的又蓋回去；退回 null、顯示時 fallback 到最新的 value 就沒這問題。
 */
export default function MonsterPicker({
	value,
	onChange,
	choices,
	closeLabel,
	cancelLabel,
	dict,
}: Props) {
	const [tab, setTab] = useState<Tab>("all");
	const [picked, setPicked] = useState<string | null>(null);
	const selected = picked ?? value;

	const visible = choices.filter(
		(c) => tab === "all" || (tab === "owned" ? c.owned : !c.owned),
	);

	return (
		<Dialog
			trigger={<Pencil aria-hidden="true" className="size-3.5" />}
			triggerLabel={dict.title}
			triggerClassName="absolute right-[7%] bottom-[9%] rounded-full bg-primary-50 p-2 text-primary-500 shadow-[0_2px_8px_rgba(13,24,82,.12)] transition-colors hover:bg-primary-100"
			title={dict.title}
			description={dict.hint}
			closeLabel={closeLabel}
			className="max-w-lg"
			onClose={() => {
				setPicked(null);
				setTab("all");
			}}
			cancel={{ label: cancelLabel }}
			confirm={{
				label: dict.use,
				disabled: selected === value,
				onClick: (close) => {
					onChange(selected);
					close();
				},
			}}
		>
			<div className="mb-4 flex flex-wrap items-center gap-2">
				<Chip active={tab === "all"} onClick={() => setTab("all")}>
					<LayoutGrid aria-hidden="true" className="size-4" />
					{dict.all}
				</Chip>
				<Chip active={tab === "owned"} onClick={() => setTab("owned")}>
					<span className="size-2 rounded-full bg-secondary-400" />
					{dict.owned}
				</Chip>
				<Chip active={tab === "locked"} onClick={() => setTab("locked")}>
					<Lock aria-hidden="true" className="size-3.5" />
					{dict.locked}
				</Chip>
			</div>

			{visible.length > 0 ? (
				<div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
					{visible.map((choice) => {
						const isSelected = choice.id === selected;
						return (
							<button
								key={choice.id}
								type="button"
								onClick={() => setPicked(choice.id)}
								aria-pressed={isSelected}
								className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 p-2 transition-colors ${
									isSelected
										? "border-primary-400 bg-primary-50/60"
										: "border-ink-100 bg-surface hover:border-primary-200 hover:bg-primary-50/40"
								}`}
							>
								{/* 右上角三態：選中打勾 > 已擁有綠點 > 未擁有鎖頭 */}
								{isSelected ? (
									<span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-primary-500 text-white">
										<Check aria-hidden="true" className="size-3" strokeWidth={3} />
									</span>
								) : choice.owned ? (
									<span
										title={dict.owned}
										className="absolute top-2.5 right-2.5 size-2 rounded-full bg-secondary-400"
									/>
								) : (
									<Lock
										aria-hidden="true"
										className="absolute top-2.5 right-2.5 size-3.5 text-ink-300"
									/>
								)}

								{/* 未擁有的灰掉，看得到造型但一眼知道還不能用 */}
								<Avatar
									src={`avatar-${choice.id}`}
									className={`w-14 sm:w-16 ${choice.owned ? "" : "opacity-60 grayscale"}`}
									sizes="64px"
									circle={false}
								/>
								<span className="text-sm font-extrabold">{choice.name}</span>
								{/* 名字下面那顆也是「已擁有」。設計稿兩處都畫了 —— 上面那顆會被
								    打勾蓋掉，這顆是選中之後仍看得到擁有狀態的那一個 */}
								<span
									className={`size-2 rounded-full ${choice.owned ? "bg-secondary-400" : "bg-transparent"}`}
								/>
							</button>
						);
					})}
				</div>
			) : (
				<p className="py-12 text-center text-sm text-ink-300">{dict.empty}</p>
			)}
		</Dialog>
	);
}

function Chip({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={active}
			onClick={onClick}
			className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-extrabold transition-colors ${
				active
					? "bg-primary-500 text-white"
					: "bg-app text-ink-500 hover:bg-primary-50 hover:text-primary-600"
			}`}
		>
			{children}
		</button>
	);
}
