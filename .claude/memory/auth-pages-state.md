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
- ⚠️ **flex 垂直置中一律用 `my-auto`，不要用 `justify-center`** —— 後者在內容高於容器時
  會往上下兩端溢出，捲動只能往下，上半部永遠捲不回來。註冊頁在 iPhone SE 上
  內容 686px、可用高度 553px，正好踩到
- **置中只在 `sm` 以上做**，手機版靠上排（`sm:my-auto`），否則頂端會多出 40 幾 px 空白
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
| 紫 | 36.7% | 距卡片頂 164px | 卡片下層 `z-0` |
| 粉紅 | 37.7%，右緣超出卡片 23.6% | 距卡片頂 224px | 卡片下層 `z-0` |
| 青綠 | 44.7%，右緣超出卡片 24.0% | 底部超出卡片 44px | 卡片上層 `z-20` |

⚠️ **垂直一律用 px 不用百分比**：註冊頁卡片比登入頁高 240px，
用百分比的話兩頁切換時怪獸會整個跳位，而使用者正是會在這兩頁來回的。

⚠️ 青綠用 `bottom` 不用 `top`，理由同上 —— 照 top 擺會整隻滑進註冊頁的正文裡。
底部負值刻意小於 main 的 `padding-bottom`（手機 `-bottom-16` 配 `pb-24`、
桌機 `sm:-bottom-11` 配 `sm:py-12`），腳才不會被 `overflow-hidden` 切掉。

`main` 的 `overflow-hidden` 是必要的：怪獸刻意超出卡片，沒有它視窗會多出橫向捲軸。

手機版只留青綠 —— 另外兩隻在窄螢幕上會整隻被卡片蓋掉，載了也看不到。

## 設計稿與現況的落差（尚未處理）

`vault/asset/login_signon.png` 是**完整的登入頁設計稿**，
`login_signup_remove.png` 是**卡片移除後**的版本（上半桌機、下半手機），用來看怪獸位置。
兩張都是同一畫面並排兩次、單一畫面 768×1024。

設計稿卡片內有、目前實作沒有的：

- 卡片頂部的 **Log in / Sign up 分頁切換**（目前是兩個獨立路由 + 底部文字連結）
- 欄位**前置 icon**（信封、鎖）與密碼的**眼睛切換**
- **Forgot password?** 連結
- **Continue with Apple**（目前只有 Google）
- 標籤是 **Email or username**（目前是 Email）
- 主按鈕是**圓角矩形**（目前是 pill）
- Logo 在**畫面左上角**（目前在卡片正上方置中），且設計稿沒有「返回首頁」
- 設計稿卡片 483px ≈ `max-w-md`（目前 `max-w-sm` 384px）

**How to apply:** 素材與定位都已完成。下一個決策點是上面那張落差清單 ——
要不要把卡片改成照設計稿（tab 切換、欄位 icon、Apple 登入），等使用者決定。
