import Image from "next/image";
import { getDictionary } from "@/dictionaries";

export default async function Footer() {
	const dict = await getDictionary();

	return (
		<footer className="border-t border-ink-100">
			<div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-10 text-center sm:flex-row sm:justify-between sm:px-8 sm:text-left">
				<div className="flex items-center gap-2.5">
					<Image
						src="/images/monster-64.png"
						alt=""
						width={28}
						height={28}
						className="size-7"
						priority
					/>
					<span className="font-extrabold tracking-tight">MonsterTalk</span>
				</div>
				<p className="text-sm text-ink-400">{dict.footer.tagline}</p>
			</div>
		</footer>
	);
}
