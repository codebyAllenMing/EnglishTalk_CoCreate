/**
 * public/ 底下的資源路徑。
 *
 * GitHub Pages 的 project pages 掛在 /<repo> 之下，所有路徑都要帶前綴。
 * Next 的 basePath 會自動改寫 next/link 與 _next/ 的資源，
 * **但 images.unoptimized 之後 next/image 的 src 是原樣輸出的** ——
 * 少了這一層，靜態站上每一張圖都會 404，而且本機 dev 完全看不出來。
 *
 * 值由 next.config.ts 的 env 注入，單一來源。
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (path: string) => `${BASE_PATH}${path}`;
