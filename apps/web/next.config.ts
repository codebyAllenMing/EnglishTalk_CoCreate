import type { NextConfig } from "next";

/**
 * GitHub Pages 是純靜態託管，需要的設定與 dev / Cloudflare 不同，
 * 所以只在 CI 帶入 GITHUB_PAGES=true 時才切換，本機 dev 完全不受影響。
 *
 * ⚠️ 靜態匯出模式下 src/proxy.ts 不會執行 —— 沒有伺服器就沒有 middleware。
 *    根路徑的語言偵測改由 public/index.html 在瀏覽器端做。
 */
const isStaticExport = process.env.GITHUB_PAGES === "true";
const basePath = isStaticExport ? "/EnglishTalk_CoCreate" : "";

const nextConfig: NextConfig = {
	...(isStaticExport && {
		output: "export",
		// project pages 的網址是 user.github.io/<repo>，少了這個前綴所有資源都會 404
		basePath,
		// 沒有伺服器能即時轉檔。我們的圖本來就是壓好的 WebP，影響有限
		images: { unoptimized: true },
		// 產出 en/index.html 而非 en.html —— GitHub Pages 是靠目錄找 index.html，
		// 沒有這個每個路由都要帶 .html 後綴才連得上
		trailingSlash: true,
	}),
	// src/asset.ts 讀這個值替 public/ 的圖片補前綴 —— next/image 在 unoptimized
	// 模式下不會自己改寫 src，少了它靜態站上每張圖都會 404
	env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
