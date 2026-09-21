import Image from "next/image";
import { asset } from "@/asset";
import type { CountryCode } from "@/Components/Profile/profileData";

/**
 * 圓形國旗。檔案在 public/flags/{code}.svg（**手動管理**，不經 build_icons.py ——
 * SVG 不需要處理）。
 *
 * ⚠️ 目前那兩個檔是佔位圖（灰底 + 代碼），等使用者下載真的國旗覆蓋。
 *    刻意用檔案而不是 emoji 國旗：Windows 沒有國旗字型，🇹🇼 會顯示成「TW」兩個字母。
 *
 * unoptimized：next/image 的最佳化器不處理 SVG，明講免得日後有人開了
 * dangerouslyAllowSVG 之後行為變掉。
 */
export default function CountryFlag({ code, className = "size-6" }: { code: CountryCode; className?: string }) {
	return (
		<Image
			src={asset(`/flags/${code.toLowerCase()}.svg`)}
			alt=""
			width={24}
			height={24}
			unoptimized
			className={`shrink-0 rounded-full ${className}`}
		/>
	);
}
