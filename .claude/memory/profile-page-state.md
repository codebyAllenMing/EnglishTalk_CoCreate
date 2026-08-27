---
name: profile-page-state
description: 個人首頁（登入後主畫面）的設計稿數據、已定決策與素材，開工前的完整脈絡
metadata:
  type: project
---

**2026-08-27 規劃。** 實作狀態見 [[frontend-build-state]]，登入流程見 [[auth-pages-state]]。

設計稿 `assets/design/個人主頁.jpg`（1448×1086）。**還沒開始寫程式**，這份是開工前的決策紀錄。

## 版面：四個區塊

| 區塊 | 內容 | 複雜度 |
|---|---|---|
| 左側邊欄 | Logo、個人資料卡、7 項選單、邀請卡 | 中 |
| 頂部列 | Token 數、通知鈴鐺、頭像下拉 | 低 |
| My Schedule | 週曆：7 天 × 時間軸、四種時段卡片、圖例、時區 | **高** |
| Find Monsters | 篩選列 + 10 張怪獸卡 + 右側可關閉詳情面板 | 中高 |

量測：頁面底色 `#FCFBF9`、側邊欄卡片寬 261px（佔 18%）、選單選中項底色 `#F0ECFB`。

## 已定決策（2026-08-27 使用者拍板）

- **這輪只做骨架 + 側邊欄**，週曆與 Find Monsters 之後分批
- **手機版用底部 tab bar**（不是漢堡抽屜）—— 純 CSS 可切，不需要 client state。
  放 5 項：`個人首頁 / My Schedule / Find Monsters / Messages / Settings`，
  Rooms 與 Reputation 只留在桌機側邊欄
- **不用 Dashboard 這個字**。路由維持 `/[lang]/home`（`AuthForm` 的 redirectTo 不用改），
  選單第一項是 `Home` / 「個人首頁」—— 使用者要的是「跟個人首頁相關的單字」
- **側邊欄 7 項全是純視覺不給連結**，照既有的「不存在的頁面不給連結」
- **假數據命名 `FAKE_PROFILE`**，與 `FAKE_STATS` / `FAKE_TESTIMONIALS` 同一套

## 未定

⚠️ **Logo 識別衝突**：設計稿左上是「ME / Mandarin × English / Keep it chill. Take it
seriously.」，但 Nav 與登入頁都已經是 **MonsterTalk**。側邊欄 logo 是常駐的，
兩套識別會同時出現。使用者 2026-08-27 說「放後面討論，只是一張圖，我可以再想想」。

## 頭像素材（已完成）

11 隻，`assets/source/avatars/`（知識庫在 `asset/avatars/`），輸出 `avatar-*.webp` 320×320，每張約 10–12 KB。

⚠️ **`Allen` 取代設計稿的 `Phoebe` 當登入者本人** —— Phoebe 只出現在側邊欄的本人位置，
卡片格狀那 10 隻是 Bobby / Luna / Alex / Mia / Sunny / Tao / Yuki / Ryan / Nina / Leo。
所以 11 張 = 10 隻夥伴 + 本人，沒有缺。

出圖規格（後續要補角色時照這個）：

```
1254×1254 正方形、去背 PNG
上半身特寫 —— 頭部佔畫面 55~65%，底部收在胸腰之間，不要畫腳
底部自然收邊，不要平切（卡片的平切效果由 CSS 裁，反過來補不回去）
```

⚠️ 這組**要進 `balance()`**（`size=320, box_weight=0.5`），與 auth 那組相反 ——
它們並排在卡片格狀裡，寬高比差異會直接變成視覺上的大小不一。
揮手的 Bobby / Tao 內容框是 1.3 的橫向，其餘都在 1.03–1.12。

⚠️ `build_icons.py` 的舊 `avatars` 群組（landing 評價區的 sophie / lucas / minji）
**已改名 `testimonials`**，把 `avatars` 讓給這批。改名不影響輸出檔名，重跑驗證位元一致。

**How to apply:** 素材與決策都就緒，下一步是搭骨架 —— 側邊欄 + 頂部列 + 主區空框。
