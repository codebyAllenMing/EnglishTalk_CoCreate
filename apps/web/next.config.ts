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
	// 計時器的純邏輯（settle）跟 server 共用同一份 TS 原始碼，要 Next 幫忙轉譯 workspace 套件
	transpilePackages: ["@monstertalk/live"],
	// dev server 被非 localhost 的 host 打到（區網 IP 給手機、Cloudflare Tunnel 的網域）時 HMR / _next 資源要放行
	allowedDevOrigins: ["192.168.*.*", "talk.allenmingstudio.com"],
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
	env: {
		NEXT_PUBLIC_BASE_PATH: basePath,
		// src/api.ts 讀這個值打後端。沒指定時 dev 跟著頁面的 host 走（localhost 或區網 IP 都行，port 4000）；
		// 靜態匯出沒有後端，給空字串（見 src/api.ts）
		NEXT_PUBLIC_API_ORIGIN: process.env.NEXT_PUBLIC_API_ORIGIN ?? "",
		NEXT_PUBLIC_API_PORT: isStaticExport ? "" : (process.env.NEXT_PUBLIC_API_PORT ?? "4000"),
	},
};

export default nextConfig;
