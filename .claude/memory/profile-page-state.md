---
name: profile-page-state
description: 個人首頁（登入後主畫面）的設計稿數據、已定決策與素材，開工前的完整脈絡
metadata:
  type: project
---

**2026-08-27 規劃。** 實作狀態見 [[frontend-build-state]]，登入流程見 [[auth-pages-state]]。

設計稿 `assets/design/個人主頁.jpg`（1448×1086）。骨架、側邊欄與 **My Schedule 週曆**已完成。

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

## 已完成

**骨架與側邊欄**（be1f453）：`Components/UI/` 五個共用元件
（`Avatar` / `LangBadge` / `Card` / `TokenCount` / `CountBadge`）、
`Components/Profile/` 六個組裝元件、`navItems.ts` / `profileData.ts`。

⚠️ **`Avatar` 的圓形底是背景色塊不是裁切遮罩** —— 怪獸身體兩側刻意超出圓形，
`overflow-hidden` 的圓框會把角、耳朵、揮手的手全切掉。圓與線上點用百分比定位，
同一個元件才能從頂部列 36px 用到個人卡 128px。

⚠️ **`ProfileCard` 的頭像刻意不給 `priority`**：品牌列 / 個人資料卡 / 邀請卡在桌機與
手機兩種版型各 render 一次（互斥的 `hidden` / `lg:hidden`），給了會 preload 兩次。

導覽七項用 `<li>` 不用 `<a>` —— 頁面都不存在，做成連結會讓鍵盤使用者 tab 到
一個按了沒反應的東西。

## My Schedule 週曆

**自己畫，不用日曆套件**（2026-08-27 決定）。關鍵理由：**這個週曆沒有事件重疊**，
每格最多一張卡，而重疊佈局演算法正是套件最主要的價值。也沒有拖拉、月/日視圖切換、
跨日或全天事件。附帶好處是整區維持 Server Component（套件幾乎都 client-only），
日期用原生 `Intl` 還自帶 i18n（英文 Mon / May 19，中文自動變週一 / 5月19日）。

檔案在 `Components/Profile/Schedule/`：`ScheduleSection`（外框 + 標題列 + ‹ ›）、
`ScheduleGrid`（Grid + 表頭 + 時間軸 + 初始捲動）、`SlotCard`（四種變體共用）、
`ScheduleLegend`、`scheduleData.ts`、`week.ts`、`fakeSchedule.json`。

### 規格

```
一天 48 格（30 分鐘一格），全天 00:00–23:59 都能放時段，外框限高、內部捲動
grid-template-columns: 4rem repeat(7, minmax(120px, 1fr))
grid-template-rows:    auto repeat(48, 34px)
卡片 → gridColumn: day + 2, gridRow: `${起始格 + 1} / span ${佔幾格}`
```

⚠️ **格高 34px 是內容推導的，不是照設計稿量的。** 設計稿的卡片高度其實是**內容
撐出來的、不等於時段長度** —— 「12:00–2:00 PM」那張畫了 80px，但時間軸上 2 小時
只有 72px；1 小時的 English practice 更畫成 110px。真按時間定位後最短的 session
只有 2 格，得裝下標題 + 時間 + 語言列三行約 66px，低於 34 那三行就被 overflow 裁掉。

⚠️ **三個 sticky 缺一不可**：表頭 `top-0`、時間軸 `left-0`、兩者交叉的左上角**兩個都要**
（少了它橫向捲動時時間軸會從表頭底下穿出去）。z-index 分三層：左上角 > 表頭 > 時間軸。

⚠️ **第一個時間標籤（12 AM）不能往上提。** 其餘標籤用 `-top-1.5` 讓文字中線對齊格線，
但第一個提上去會鑽進 sticky 表頭底下被切掉 —— 它的線正好是格子頂端，不提剛好對齊。

`minmax(120px, 1fr)` 一份 CSS 應付兩種版型：桌機被 `1fr` 撐滿，手機七欄合計 896px
超出畫面而自然橫向捲動（使用者要的手勢拖拉），不用另寫斷點。
‹ › 放在捲動容器**外面**，橫向捲動時不會跟著跑掉。

### 初始捲動（踩過的坑）

全天展開 1632px，不捲的話打開只看到空白凌晨。用 inline script 設 `scrollTop`
（跟著 HTML 一起送達、hydration 前執行、整區維持 Server Component）。

⚠️⚠️ **不能只設一次。** Next.js **dev 模式的 CSS 是用 JS 注入的** —— script 執行那一刻
`max-h` 還沒套用，`scrollHeight === clientHeight`，`scrollTop` 被瀏覽器 clamp 成 0。
production 的 CSS 是 head 裡的 blocking `<link>`，第一次就會成功。
**這是「dev 壞、prod 好」的差異，最難察覺。**

解法：先試一次，判斷條件用 `scrollHeight > clientHeight`（能不能捲的直接證據，
不去猜 CSS 何時注入完）；不成就用 `ResizeObserver` 等容器真的變可捲動再設，
設完立刻 `disconnect`。比賭 `requestAnimationFrame` 的單一時機可靠。

### 假資料

`fakeSchedule.json` 13 個時段。時間存 `"16:00"` 字串不存分鐘數 —— 對設計稿時
不用心算，轉換在 `scheduleData.ts` 做一次。`weekStart` 用 `2025-05-19` 是因為
那天剛好是星期一、跟設計稿的 Mon May 19 對得上（2026 年的 5/19 是星期二），
畫面不顯示年份所以看不出差別。

⚠️ `todayIndex` **由資料/props 傳入，不在元件裡算 `new Date()`** —— 靜態匯出是
建置期 render，元件內算出來的「今天」會凍結在部署那一天。

⚠️ `week.ts` 解析日期字串刻意不用 `new Date("2025-05-19")` —— 那格式會被當成
**UTC 午夜**，在 UTC-5 的瀏覽器會倒退成 5/18。拆成年月日交給建構子才是本地時間。

天氣圖示**不做**（2026-08-27 使用者決定）：設計稿自己就不一致
（Wed 16:00 是半陰太陽、Sat 16:00 卻是月亮），判斷規則不明，先略過。

`hosted`（紫）卡片的標題目前顯示「開放中」，因為設計稿的紫卡標題確實也是 Open。
等有房間名稱再改。

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

**How to apply:** 下一步是 **Find Conversation Monsters** —— 篩選列 + 10 張怪獸卡
+ 右側可關閉的詳情面板。卡片直接套 `Avatar` 與 `LangBadge`，素材已全部入庫。
