import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { asset } from "@/asset";
import { getDictionary } from "@/dictionaries";

/**
 * 側邊欄底部的邀請卡。
 *
 * 怪獸刻意溢出卡片的左下角 —— 跟登入頁那隻青綠是同一個手法，
 * 所以卡片不能用 overflow-hidden，圖用負的 margin 往外推。
 * 星星與碎片畫在圖裡（見 assets/source/profile/invite.png），不另外拼裝。
 *
 * 按鈕沒有行為：邀請流程要等後端發代幣才有意義。
 */
export default async function InviteCard() {
	const dict = await getDictionary();
	const { invite } = dict.profile;

	return (
		<div className="relative flex items-center gap-1 rounded-2xl bg-primary-50 py-3 pr-4 pl-1">
			<Image
				src={asset("/images/profile-invite.webp")}
				alt=""
				width={239}
				height={256}
				sizes="88px"
				className="-mb-3 -ml-3 h-auto w-22 shrink-0"
			/>
			<div className="min-w-0 flex-1">
				<p className="text-xs leading-snug font-extrabold">{invite.title}</p>
				<button
					type="button"
					className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-extrabold text-primary-600 transition-colors hover:bg-primary-100"
				>
					{invite.cta}
					<ArrowRight aria-hidden="true" className="size-3.5" />
				</button>
			</div>
		</div>
	);
}
