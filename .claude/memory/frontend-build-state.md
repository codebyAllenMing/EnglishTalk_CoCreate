---
name: frontend-build-state
description: MonsterTalk 前端已建置的內容、技術決策與待辦，壓縮/跨 session 後接續用
metadata:
  type: project
---

**2026-08-20 建立。** 產品規格在 Obsidian vault（見 [[englishtalk-vault-pointer]]），此處記實作狀態。

## 已完成

`apps/web` — Next.js 16.3.1 + React 19.2.8 + TS 5.9 + Tailwind v4 + pnpm workspace

- **i18n**：`app/[lang]/`，en + zh-TW，官方 dictionary 模式（未用 next-intl），`src/proxy.ts` 做語言偵測。Next 16 已把 `middleware` 改名 `proxy`
- **頁面**：landing **七區全數完成**（Nav / Hero / Features / HowItWorks + Stats 兩欄 / Testimonials / Closing / Footer）+ login（僅 UI，無 auth）
- **素材**：banner 桌機/手機兩種構圖（`<picture>` 切換）、揮手怪獸、favicon 全套（ico/svg/apple-icon/maskable）
- **全部 16 張圖示 / 插圖**（2026-08-20 完成）— 3D 黏土風 WebP，各 256×256。
  四特色 4 + 四步驟 4 + 統計面板 4 + 探頭怪獸 1 + 評價 avatar 3。**全站圖檔 373 KB**
- **假數據已實作但標記清楚**：統計面板 `FAKE_STATS`、評價區 `FAKE_TESTIMONIALS`，
  `grep "FAKE_"` 全數可找。⚠️ 上線前必須換掉或整區移除
- 四路由全部 SSG，build + lint 通過
- **已部署 GitHub Pages**：https://codebyallenming.github.io/EnglishTalk_CoCreate/
  push 到 main 自動 build。repo 是 **public**（共創專案，使用者確認無機密）

## 關鍵決策

- **Node 24.19.0**（全域 default 已切）；`.nvmrc` = 24
- **pnpm 被 shell alias 攔截**，一律用 `command pnpm`
- **dev server port 6531**（寫在 package.json）
- **不存在的頁面不給連結**：導覽列四項、Sign up、CTA 按鈕皆為純視覺，不做轉導
- **統計數字與使用者評價兩區未實作** — 視覺稿的假數據，待決定拿掉或換內容
- **素材入庫前一律程式化調色**到 palette（紫色 AI 生成已漂移四次）
- **弧線用 CSS 不切圖**：`.arc-top` 的 `clamp(20px, 5vw, 100px)`。
  ⚠️ 原本寫 1.9vw 是**量錯的**，實測設計稿是 5.08%（稿寬 1024、弧高 52px）。
  形狀確認是橢圓弧（用橢圓公式回推誤差 <1px），所以 `border-radius: 50%` 正確
- **底部怪獸的腳是被裁掉的**：section `overflow-hidden` + 負 margin 溢出，不是完整站著。
  ⚠️ 那個負 margin **只能掛在 `lg:`**（2026-08-23 修）。`lg` 是 `flex-row`，負 margin
  的效果是自己往下溢出；掉到 `lg` 以下變成 `flex-col`，**同一個值會改成把下一個元素往上拉**，
  標題直接被拉進怪獸肚子裡。負 margin 的語意會隨 flex 方向翻轉，跨斷點時要特別檢查
- **UI icon 用 `lucide-react`**（2026-08-23，全專案第一個也是唯一的 UI 相依）。
  ⚠️ 關鍵是**在 Server Component 裡用** —— icon 於建置期 render 成靜態 SVG，
  client bundle 完全沒有 lucide（實測 chunk 內只剩一個 module 名字串，
  無 `createLucideIcon`、無 path 資料）。一旦某個欄位需要 client state
  （例如密碼的眼睛切換），那一頁的 icon 才會進 client bundle
- **品牌 logo 不走 icon library**：Google / Apple 要內嵌官方彩色 SVG。
  Font Awesome brands 是單色字形，不符 Google 品牌規範，設計稿也是彩色的
- **格式判準**：扁平可縮放的小圖示 → SVG；有漸層質感的插圖 → WebP（實測描邊 SVG 613KB/31色 vs WebP 34KB/48948色）
- ⚠️ **Next dev 的圖片優化快取不會因為來源檔案改變而失效**（2026-08-27 踩過）。
  改了 `public/images/` 的圖、重跑 build_icons，畫面卻還是舊的 —— 回應帶
  `X-Nextjs-Cache: HIT`。要 `rm -rf apps/web/.next/dev/cache/images` 才會重新編碼，
  瀏覽器那份還要再硬重新整理。**上線不會遇到**：`GITHUB_PAGES=true` 走
  `images.unoptimized`，圖片直接從 public/ 出去，沒有這層快取
- ⚠️ **dev 的圖片優化端點會依 `Accept` 協商格式**。用 curl 不帶 header 測會拿到
  **JPEG（沒有 alpha，透明區變黑）**，那是測試方式的問題不是圖的問題；
  瀏覽器一定會送 `image/webp`
- **靜態匯出只在 `GITHUB_PAGES=true` 時啟用**，本機 dev 不受影響。
  `src/asset.ts` 替 public/ 圖片補 basePath —— `images.unoptimized` 後 `next/image`
  不會自己改寫 src，少了它靜態站上每張圖都 404 而本機看不出來
- **`proxy.ts` 在靜態匯出下不執行**（沒有伺服器）。根路徑語言分流改由
  `public/index.html` 在瀏覽器端做。改用 Cloudflare Pages 的話拿掉 `GITHUB_PAGES` 即可恢復

## 待辦

0. **下一步：個人首頁的 My Schedule 週曆**。骨架與側邊欄已完成（be1f453），
   見 [[profile-page-state]]。週曆決定**自己畫不用套件** —— 沒有事件重疊，
   套件最主要的價值用不到；30 分鐘粒度用 CSS Grid 的 `grid-row: span N` 直接對應
   ⚠️ `/[lang]/home` 沒有任何存取保護，登入是假的（見 `AuthForm` 的 `FAKE_AUTH`），
   直接打網址就能進
0.5 登入 / 註冊頁**已完成**（見 [[auth-pages-state]]），
   與設計稿仍有落差清單未處理，最大一項是 Log in / Sign up 分頁切換
   —— 它會動到「兩個獨立路由 vs 單頁切換」的結構
1. Nav 的「MonsterTalk」字重 — 現 Nunito 800，UI kit 有 5 組對照待挑
2. **【延後到最後】**（2026-08-27 使用者指定，不影響目前進度）產品命名 MonsterTalk
   為暫定，Logo 檔仍是 ME 識別，兩者不相容。個人首頁側邊欄現在用 MonsterTalk，
   設計稿是「ME / Mandarin × English」—— 定案後只需改 `BrandBlock.tsx` 一個檔案
2.5 **【延後到最後】`.arc-top` 的程式碼與本檔記載對不上**：globals.css 實際是
   `clamp(14px, 1.9vw, 44px)`，但下方「關鍵決策」記著已改成 5vw、1.9vw 是量錯的。
   **碰 landing 前要先釐清哪個才對**，別照著錯的那份改
3. **上線前換掉假數據**（`grep "FAKE_"`）
4. Cloudflare Pages 為原訂方案（proxy.ts 能跑、Image 最佳化在），目前先走 GitHub Pages

## 位置

- 程式碼 `apps/web/`，UI kit `_dev/ui-kit/index.html`
- **素材在專案內 `assets/`**（2026-08-20 從 vault 複製過來，只留用到的 13MB）：
  `design/` 視覺稿、`source/` AI 母檔、`tools/` 處理腳本。vault 的 `asset/` 保持不動，仍是原始工作區
- **`apps/web/public/images/` 由 `assets/tools/build_icons.py` 產出，不要手動編輯**
- UI kit artifact: https://claude.ai/code/artifact/0543ca02-3dfd-487c-90e5-44d5c5d5433a

**How to apply:** 接續開發前先讀此檔確認進度；產品規則去 vault 查，不要在 repo 內另建規格文件。
