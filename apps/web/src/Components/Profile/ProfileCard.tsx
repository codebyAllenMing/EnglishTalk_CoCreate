import { BarChart3, Pencil, Star } from "lucide-react";
import Avatar from "@/Components/UI/Avatar";
import Card from "@/Components/UI/Card";
import LangBadge from "@/Components/UI/LangBadge";
import TokenCount from "@/Components/UI/TokenCount";
import { getDictionary } from "@/dictionaries";
import { FAKE_PROFILE } from "./profileData";

/**
 * 個人資料卡：頭像、名字、語言、程度、評價、代幣、自我介紹。
 *
 * 編輯按鈕沒有行為 —— 個人資料編輯頁尚未存在，照既有決策不給連結。
 */
export default async function ProfileCard() {
	const dict = await getDictionary();
	const { card, lang, level, demo } = dict.profile;
	const p = FAKE_PROFILE;

	return (
		<Card className="relative p-5">
			<button
				type="button"
				aria-label={card.edit}
				className="absolute top-4 right-4 rounded-full border border-ink-100 bg-primary-50 p-2 text-primary-500 transition-colors hover:bg-primary-100"
			>
				<Pencil aria-hidden="true" className="size-3.5" />
			</button>

			<Avatar
				src={p.avatar}
				className="mx-auto w-32"
				sizes="128px"
				online={p.online}
				onlineLabel={card.online}
			/>

			<h2 className="mt-1 text-center text-xl font-extrabold">{p.name}</h2>

			<dl className="mt-4 space-y-2">
				<LangRow code={p.nativeCode} label={card.native} value={lang[p.nativeCode]} />
				<LangRow code={p.learningCode} label={card.learning} value={lang[p.learningCode]} />
			</dl>

			<p className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary-50 py-2 text-sm font-extrabold text-primary-600">
				<BarChart3 aria-hidden="true" className="size-4" />
				{level[p.level]}
			</p>

			<dl className="mt-4 divide-y divide-ink-100 text-sm">
				<Row label={card.reputation}>
					<span className="flex items-center gap-1.5 font-extrabold">
						<Star aria-hidden="true" className="size-4 fill-token text-token" />
						{p.reputation}
					</span>
				</Row>
				<Row label={card.tokens}>
					<TokenCount count={p.tokens} label={card.tokens} />
				</Row>
			</dl>

			<p className="mt-3 text-sm leading-relaxed text-ink-500">{demo.bio}</p>
		</Card>
	);
}

function LangRow({ code, label, value }: { code: "zh" | "en"; label: string; value: string }) {
	return (
		<div className="flex items-center gap-2.5 rounded-xl border border-ink-100 px-3 py-2">
			<dt>
				<LangBadge code={code} />
			</dt>
			<dd className="text-sm font-semibold">
				<span className="text-ink-500">{label}: </span>
				{value}
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
