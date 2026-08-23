---
name: auth-pages-state
description: 登入 / 註冊 / 個人首頁的實作狀態、怪獸插圖的定位數據，以及與設計稿的落差
metadata:
  type: project
---

**2026-08-21 建立。** 實作狀態見 [[frontend-build-state]]，產品規格在 vault。

## 已完成

- `/[lang]/login`、`/[lang]/signup`、`/[lang]/home`（登入後的 placeholder）
- 共用元件 `AuthShell` / `AuthField` / `AuthForm` / `AuthDivider`
- 註冊欄位：displayName / email / password / confirmPassword
- 八個路由全部 SSG，lint + build 通過
- 背景與三隻怪獸插圖（2026-08-23）

## 關鍵決策

- **假登入**：`AuthForm` 的 `FAKE_AUTH`，送出只檢查兩次密碼是否一致，其餘直接轉頁。
  API 之後再串（使用者 2026-08-21 指定「先做頁面」）
- **路由 `/home` 而非 `/dashboard`**：landing 是給未登入者看的，`/home` 才是登入後的家
- **`/home` 沒有任何存取保護**，直接打網址就能進，頁面上有寫明
- ⚠️⚠️ **flex 垂直置中一律用 `justify-center-safe`（`justify-content: safe center`）。
  `justify-center` 不行，`my-auto` 也不行** —— 兩者在內容高於容器時都會往**上下兩端**
  溢出，捲動只能往下，被推到負座標的上半部永遠捲不回來。
  **踩過兩次**：手機版註冊頁（內容 686px / 可用 553px），
  以及桌機版註冊頁（內容 958px / 筆電可視高度 800–900px）。
  2026-08-23 全面換成 `safe`，它的作用就是內容放不下時自動退回 start 對齊。
  不支援的瀏覽器整條宣告失效、退回 flex-start（靠上排），降級行為剛好也是要的。
  `AuthShell` 與 `/home` 都已套用
- **置中只在 `sm` 以上做**，手機版靠上排（`justify-start` + `sm:justify-center-safe`），
  否則頂端會多出 40 幾 px 空白
- **返回首頁 RWD**：手機版在品牌列右側與 logo 同列（不用 absolute，320px 螢幕會撞），
  桌機版在卡片下方，兩者互斥

## 素材（2026-08-23 已套用）

母檔複製到 `assets/source/auth/`（知識庫原檔不動），由 `build_icons.py` 的 **auth** 群組出圖。
這組不進 `balance()` —— 那個演算法是為了「一排並列的圖示份量相當」而寫，
這裡每隻各自絕對定位在版面不同角落，尺寸由設計稿決定，硬要互相對齊反而錯。
改走 `trim()` 去透明邊 + `fit()` 縮長邊到 512。

| 母檔 | 輸出 | 用途 |
|---|---|---|
| `auth/monster_01_v1.png` | `auth-monster-wave.webp` 41 KB | 青綠揮手，登入頁 |
| `auth/monster_01_v2.png` | `auth-monster-stand.webp` 34 KB | 同一隻站姿，註冊頁 |
| `auth/monster_02_v1.png` | `auth-monster-headphones.webp` 43 KB | 紫戴耳機，卡片左側 |
| `auth/monster_03_v1.png` | `auth-monster-antenna.webp` 30 KB | 粉紅觸角，卡片右側 |
| `auth/background.png` | `auth-background.webp` **11 KB** | 滿版背景，不 trim 不去背 |

⚠️ `trim()` 的 `alpha_floor` 預設 8 而不是 0：AI 出圖的邊緣常有一圈 alpha 1~5 的雜訊，
照 0 去裁會多留十幾 px 空邊，絕對定位就對不準。

背景圖是**極淡的暖色塊（251~254）+ 散落小圓點**，肉眼只看得到圓點；
要看清楚內容得把對比拉高（`(a-235)*8+200`）才有得看。

## 怪獸的定位（換算自設計稿）

設計稿單一畫面 768×1024、卡片 x143–626 y102–951（483×849）。
三隻都掛在**卡片**那層 relative 上，不是掛在視窗上 —— 它們是繞著卡片排的，
跟著視窗跑會在寬螢幕上被甩開。

| | 寬（佔卡片寬） | 垂直 | 層級 |
|---|---|---|---|
| 紫 | 36.7% | 距卡片頂 **96px** | 卡片下層 `z-0` |
| 粉紅 | 37.7%，右緣超出卡片 23.6% | 距卡片頂 **160px** | 卡片下層 `z-0` |
| 青綠 | 44.7%，右緣超出卡片 24.0% | 底部超出卡片 44px | 卡片上層 `z-20` |

⚠️ **垂直一律用 px 不用百分比**：註冊頁卡片比登入頁高 240px，
用百分比的話兩頁切換時怪獸會整個跳位，而使用者正是會在這兩頁來回的。

⚠️ **但 px 不能照抄設計稿的 206 / 280**：設計稿卡片有 849px 高（多了分頁切換、
Forgot password、Apple 登入），實際只有 520px，垂直空間少了四成。照抄的結果是
粉紅的下巴壓在青綠頭上（實測只差 11px）。96 / 160 是壓縮後的值，
粉紅底部離青綠頭留 70px。**改動卡片內容時要重算這兩個值。**

⚠️ 青綠用 `bottom` 不用 `top`，理由同上 —— 照 top 擺會整隻滑進註冊頁的正文裡。
底部負值刻意小於 main 的 `padding-bottom`（手機 `-bottom-16` 配 `pb-24`、
桌機 `sm:-bottom-11` 配 `sm:py-12`），腳才不會被 `overflow-hidden` 切掉。

⚠️⚠️ **`main` 一定要 `overflow-x-clip`，絕對不能用 `overflow-hidden`。**
怪獸刻意超出卡片，不裁的話視窗會多出橫向捲軸 —— 但 `overflow: hidden` 是**兩軸一起**裁的，
註冊頁卡片 746px 高，超出視窗的下半截會直接消失而且捲不到（2026-08-23 踩到）。
`overflow-x: clip` 只管水平，而且 clip 不建立捲動容器。

**手機版三隻都淡化：紫與粉紅 40%、青綠 60%**，且紫與粉紅翻到卡片上層（`z-20`）
（2026-08-23 使用者決定）。青綠不跟到 40% 是因為它大半壓在**背景**而非白卡上 ——
米白底上再降到四成會幾乎消失。390px 視窗扣掉 `px-5` 後卡片就佔 350px、左右各只剩 20px，
留在下層只能露出 16% 等於一條色邊。淡化後壓在表單邊緣仍讀得到字，
也接近設計稿手機版把三隻都畫進框裡的意思。
桌機再翻回下層（`sm:z-0 sm:opacity-100`）。

## 語言切換

`Components/LocaleSwitch.tsx`，Nav 與 AuthShell 共用。

**這是全站唯一的 Client Component**，理由只有一個：切換後要留在原本那一頁。
先前它是 Nav.tsx 的私有元件、寫死 `href={/${locale}}`，在 landing 上看不出差別
（本來就在首頁），但放到登入 / 註冊頁就會變成「填到一半切語言，整頁跑掉」。

⚠️ `locales` 由 Server Component 以 prop 傳入，**不能在 client 直接 import
`@/dictionaries`** —— 那個模組相依 `next/root-params`，會把 server-only 的東西
拖進 client bundle。

⚠️ `usePathname()` 回傳的路徑**不含 basePath**（Next 剝掉），而 `<Link>` 又會補上，
所以直接操作路徑字串就對了。尾斜線同理：dev 拿到 `/zh-TW/login`、
靜態站拿到 `/zh-TW/login/`，換掉第一段後兩邊各自維持原形狀，不會多一次 308。
靜態匯出驗過產出是 `/EnglishTalk_CoCreate/en/login/`。

版面：桌機釘在畫面右上角（`absolute top-5 right-5`，那裡是空的，不必跟置中的 logo
搶同一列）；手機併進品牌列右側，與返回首頁同一組。那一列在 375px 上很緊，
英文 "Back to home" 又比中文長，所以 **380px 以下只留箭頭**（`max-[380px]:hidden`）。

## 設計稿與現況的落差（尚未處理）

`vault/asset/login_signon.png` 是**完整的登入頁設計稿**，
`login_signup_remove.png` 是**卡片移除後**的版本（上半桌機、下半手機），用來看怪獸位置。
兩張都是同一畫面並排兩次、單一畫面 768×1024。

設計稿卡片內有、目前實作沒有的：

- 卡片頂部的 **Log in / Sign up 分頁切換**（目前是兩個獨立路由 + 底部文字連結）
- 設計稿沒有語言切換 —— 那是 i18n 必要的入口，額外加的
- 欄位**前置 icon**（信封、鎖）與密碼的**眼睛切換**
- **Forgot password?** 連結
- **Continue with Apple**（目前只有 Google）
- 標籤是 **Email or username**（目前是 Email）
- 主按鈕是**圓角矩形**（目前是 pill）
- Logo 在**畫面左上角**（目前在卡片正上方置中），且設計稿沒有「返回首頁」
- 設計稿卡片 483px ≈ `max-w-md`（目前 `max-w-sm` 384px）

**How to apply:** 素材與定位都已完成。下一個決策點是上面那張落差清單 ——
要不要把卡片改成照設計稿（tab 切換、欄位 icon、Apple 登入），等使用者決定。
