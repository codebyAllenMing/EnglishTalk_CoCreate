"use client";

import { BarChart3, Pencil, Star } from "lucide-react";
import Link from "next/link";
import Avatar from "@/Components/UI/Avatar";
import Card from "@/Components/UI/Card";
import CountryFlag from "@/Components/UI/CountryFlag";
import TokenCount from "@/Components/UI/TokenCount";
import type { Dictionary } from "@/dictionaries";
import { useProfile } from "@/profile/ProfileProvider";
import { fill } from "./Monsters/monstersData";
import { FAKE_PROFILE, LANG_FLAG, type LangCode } from "./profileData";

type Props = {
	locale: string;
	card: Dictionary["profile"]["card"];
	lang: Dictionary["profile"]["lang"];
	level: Dictionary["profile"]["level"];
};

/**
 * 個人資料卡：頭像、名字、語言、程度、評價、代幣、自我介紹。
 *
 * 個人資料從 ProfileProvider 來（client 載入），所以整張卡是 client；字典由頁面以 props 餵。
 * 載到之前畫骨架 —— 靜態 HTML 沒有資料，第一次 render 一定是空的。
 * ⚠️ 評價、代幣、線上仍是 FAKE_PROFILE：評分與代幣的表還沒建、線上要等 WS。
 *
 * 右上角的筆連到 /settings。原本做成對話框（含巢狀的選擇怪獸），
 * 使用者 2026-09-21 與夥伴討論後改成獨立頁面 —— 九個欄位的表單本來就不該
 * 塞在對話框裡。
 */
export default function ProfileCard({ locale, card, lang, level }: Props) {
	const { profile } = useProfile();
	const fake = FAKE_PROFILE;

	return (
		<Card className="relative p-5">
			<Link
				href={`/${locale}/settings`}
				aria-label={card.edit}
				className="absolute top-4 right-4 rounded-full border border-ink-100 bg-primary-50 p-2 text-primary-500 transition-colors hover:bg-primary-100"
			>
				<Pencil aria-hidden="true" className="size-3.5" />
			</Link>

			{profile ? (
				<Avatar
					src={`avatar-${profile.avatar}`}
					className="mx-auto w-32"
					sizes="128px"
					online={fake.online}
					onlineLabel={card.online}
				/>
			) : (
				<div aria-hidden="true" className="mx-auto size-32 animate-pulse rounded-full bg-primary-100" />
			)}

			<h2 className="mt-1 text-center text-xl font-extrabold">
				{profile ? profile.name : <Placeholder className="mx-auto h-6 w-24" />}
			</h2>

			<dl className="mt-4 space-y-2">
				{/* 不放「中 / EN」徽章（跟文字講同一件事），列尾放語言的國旗，跟設定頁同一顆（使用者 2026-09-22） */}
				<LangRow label={card.native} lang={profile?.nativeLang} value={profile && lang[profile.nativeLang]} />
				<LangRow label={card.learning} lang={profile?.learningLang} value={profile && lang[profile.learningLang]} />
			</dl>

			<p className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary-50 py-2 text-sm font-extrabold text-primary-600">
				<BarChart3 aria-hidden="true" className="size-4" />
				{/* 徽章是學習語言的程度（跟 Find Monsters 同一個欄位）。設計稿沒標籤，單看會不知道指哪一邊，
				    使用者 2026-09-22 要求帶上語言名：「English 程度：中級」 */}
				{profile ? (
					fill(card.levelOf, { lang: lang[profile.learningLang], level: level[profile.learningLevel] })
				) : (
					<Placeholder className="h-4 w-28" />
				)}
			</p>

			<dl className="mt-4 divide-y divide-ink-100 text-sm">
				<Row label={card.reputation}>
					<span className="flex items-center gap-1.5 font-extrabold">
						<Star aria-hidden="true" className="size-4 fill-token text-token" />
						{fake.reputation}
					</span>
				</Row>
				<Row label={card.tokens}>
					<TokenCount count={fake.tokens} label={card.tokens} />
				</Row>
			</dl>

			{profile ? (
				profile.bio && <p className="mt-3 text-sm leading-relaxed text-ink-500">{profile.bio}</p>
			) : (
				<Placeholder className="mt-3 h-10 w-full" />
			)}
		</Card>
	);
}

function Placeholder({ className }: { className: string }) {
	return <span aria-hidden="true" className={`block animate-pulse rounded-md bg-ink-100 ${className}`} />;
}

function LangRow({ label, lang, value }: { label: string; lang?: LangCode; value?: string | null }) {
	return (
		<div className="flex items-center rounded-xl border border-ink-100 px-3 py-2 text-sm font-semibold">
			<dt className="text-ink-500">{label}:&nbsp;</dt>
			<dd className="flex flex-1 items-center justify-between gap-2">
				{value ?? <Placeholder className="inline-block h-3.5 w-14 align-middle" />}
				{lang ? <CountryFlag code={LANG_FLAG[lang]} /> : <Placeholder className="size-6 rounded-full" />}
			</dd>
		</div>
	);
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-center justify-between py-2.5">
			<dt className="text-ink-500">{label}</dt>
			<dd>{children}</dd>
		</div>
	);
}
