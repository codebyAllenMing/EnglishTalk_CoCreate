---
name: profile-page-state
description: 個人首頁（登入後主畫面）的設計稿數據、已定決策與素材，開工前的完整脈絡
metadata:
  type: project
---

**2026-08-27 規劃。** 實作狀態見 [[frontend-build-state]]，登入流程見 [[auth-pages-state]]。

設計稿 `assets/design/個人主頁.jpg`（1448×1086）。骨架、側邊欄與 **My Schedule 週曆**已完成。

> **2026-09-22 更新**：個人資料卡、頂部列頭像、設定頁已接真資料（`ProfileProvider` + `GET/PUT /api/me/profile`，
> 見 [[data-model-decisions]]）。`FAKE_PROFILE` 只剩評價 / 代幣 / 線上 / 通知；`FAKE_AVATAR_CHOICES` 改名 `AVATAR_CATALOG`
> （鏡射 DB 的 Avatars 表，`owned` 仍是假的 `FAKE_OWNED`）。ProfileCard 已是 client 元件（載到前畫骨架）。
> **Find Monsters 也接真資料了**（同日稍晚）：名單 `GET /api/users`、線上狀態 `GET /api/presence` 每 30 秒；
> `fakeMonsters.json` / `FAKE_MONSTERS` 已刪。卡片藥丸與面板改顯示線上狀態，「房間最多 N 人」「下次有空」「名額」
> 拿掉等房間的表。`Monster` 型別多了 `avatar` / `presence` / `lastSeenDate`，少了 `online` / `roomSize` / `freeAt` / `slotsOpen`。
> 個人資料卡的語言列：不放「中 / EN」徽章、列尾放語言的國旗（`LANG_FLAG` 抽到 profileData.ts）；程度徽章帶語言名。
> 本檔其餘關於「假資料」的描述以這段為準。

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
  ⚠️ **導覽已改過兩次，現行版本照 `Profile Setting.jpg`**（使用者 2026-09-21 拍板）：
  `Home / My Schedule / Find Monsters / Rooms / History / Word Bank / Settings` 七項。
  History 與 Word Bank 是新的，Messages 與 Reputation 拿掉。
  中間曾因「已經在畫面常駐」移除 My Schedule / Find Monsters —— 那個理由只在 `/home`
  成立，多了設定頁之後它們回來了，連到 `/home#schedule` / `/home#monsters` 錨點。
  `inTabBar` 旗標也回來了（七項只放得下五項，History / Word Bank 只在桌機）
- **不用 Dashboard 這個字**。路由維持 `/[lang]/home`（`AuthForm` 的 redirectTo 不用改），
  選單第一項是 `Home` / 「個人首頁」—— 使用者要的是「跟個人首頁相關的單字」
- **側邊欄沒有 href 的項目不給連結**（Rooms / History / Word Bank），照既有的「不存在的頁面不給連結」
- **假數據命名 `FAKE_PROFILE`**，與 `FAKE_STATS` / `FAKE_TESTIMONIALS` 同一套

## 已完成

**骨架與側邊欄**（be1f453）：`Components/UI/` 五個共用元件
（`Avatar` / `LangBadge` / `Card` / `TokenCount` / `CountBadge`）、
`Components/Profile/` 六個組裝元件、`navItems.ts` / `profileData.ts`。

⚠️ **`Avatar` 的圓形底是背景色塊不是裁切遮罩** —— 怪獸身體兩側刻意超出圓形，
`overflow-hidden` 的圓框會把角、耳朵、揮手的手全切掉。圓與線上點用百分比定位，
同一個元件才能從頂部列 36px 用到個人卡 128px。

### 個人設定頁 `/[lang]/settings`（設計稿 `assets/design/Profile Setting.jpg`）

**2026-09-21 改版**：原本是個人資料卡上的對話框（含巢狀的選擇怪獸），使用者與夥伴討論後
改成獨立頁面。`EditProfileDialog.tsx` 與 `MonsterPicker.tsx` **已刪除**，字典的
`profile.edit` / `profile.picker` 換成 `profile.settings`。`avatarChoices.ts` 留著給怪獸方格用。

檔案：`app/[lang]/settings/page.tsx`（server，餵初始值）、
`Components/Profile/Settings/SettingsForm.tsx`（client，整張表單）、
`Components/UI/CountryFlag.tsx`、`public/flags/{tw,us}.svg`。

**殼抽成 `Components/Profile/AppShell.tsx`**（側邊欄 + 頂部列 + TabBar），`/home` 與
`/settings` 都用它。⚠️ **是元件不是 layout.tsx**：側邊欄的內容每頁不同（首頁有個人資料卡
與邀請卡、設定頁只有導覽 —— 你正在編輯的東西不該同時顯示在旁邊），Next 的 layout
拿不到子頁的 props，為兩個 slot 走 parallel routes 太重。slot：`heading`（桌機在頂部列
左側、窄版落到主內容上方）、`beforeNav` / `afterNav`（桌機側邊欄）、`mobileTop` /
`mobileBottom`。導覽高亮由頁面用 `current` 傳入，不讀路由，整個側邊欄維持 server。

**已定的產品規則**（使用者 2026-09-21）：
- **母語可以改**（前一版對話框的稿是鎖住的，這版是下拉，以這版為準）
- 國家只有兩個：`TW` / `US`，名稱用 `Intl.DisplayNames({ type: "region" })` 依語系產生，
  不進字典
- 怪獸方格**用現有的上半身頭像**，不照設計稿出全身像
- 預覽個人頁 = Find Monsters 的詳情（`MonsterDetails`，從 `MonsterPanel` 抽出來的），
  把表單目前的值餵進去；房間人數與下次有空不在表單上，先用假值

**我自己決定的**（使用者沒反對就照這樣）：
- 程度加了 `fluent`（設計稿母語程度是 Fluent），母語程度與學習程度共用同一個四段量表。
  `LevelCode` 因此多一個值，Find Monsters 的篩選下拉自動多出「流利」
- 母語與學習語言**互斥自動翻轉**：只有兩種語言，改其中一個撞到另一個就把另一個翻過去
- 性別四項固定（`settings.genderOptions`）。**興趣是自由輸入**（使用者 2026-09-21：
  「讓他自己填」）：Enter 或 ＋ 加標籤、`<datalist>` 拿字典的十二個當建議但不限制，
  單個 20 字、最多 10 個、大小寫不分去重。假資料存代碼，`settings/page.tsx` 換成當前語系文字
- 十一隻怪獸用 grid 折行不橫向捲動；表單 md 以上六欄 grid（名稱 / 國家 / 性別各 2、
  語言與程度各 3、興趣與自我介紹 6），以下單欄
- 顯示名稱 20 字、自我介紹 150 字照稿
- Cancel 是連回 `/home` 的 Link；**儲存變更 disabled**（沒有 API）

⚠️ **國旗不用 emoji**：Windows 沒有國旗字型，🇹🇼 會顯示成「TW」兩個字母。
`public/flags/` 是**手動管理**的（SVG 不經 `build_icons.py`），目前兩個檔是佔位圖
。使用者已換成 HatScripts/circle-flags 的正版。**設定頁的語言欄位也放國旗**
（使用者 2026-09-21 指定，`LANG_FLAG` zh→TW / en→US）—— 只有這張表單跟國家欄位並排，
全站其他地方的語言仍是 `中` / `EN` 徽章。

### `Dialog` 這一輪的三處改動

⚠️ **標題 id 改用 `useId()`**（修掉既有 bug）。原本寫死 `id="dialog-title"`，
但同一頁上的 Dialog 不只一個（週曆每張卡片一個、`ProfileCard` 在桌機與手機版型
各一個），`aria-labelledby` 會一律指到 DOM 裡的第一個 —— 每個對話框都被螢幕閱讀器
唸成同一個標題，HTML 也不合法。設定頁表單的輸入框 id 同理（`useId()` 派生）。

新增 `triggerLabel`：**只有圖示的觸發鈕**（那支筆）沒有它只會被唸成「按鈕」。

新增 `onClose`：接原生的 close 事件，所以 **Esc / ✕ / 點遮罩 / 取消鈕四條路都會觸發**。
表單關閉時還原草稿就靠它 —— 在每顆按鈕上各補一次一定會漏掉 Esc。

**底部按鈕改成設計稿的樣子**：兩顆等寬（`flex-1`）、`rounded-xl`、沒有分隔線，
取消是淡紫實心而不是外框。只給一顆時它自己佔滿整列。✕ 也跟著改成實心圓。
⚠️ 這是共用元件的改動，**週曆的「開放時段」對話框外觀也跟著變了** —— 那是刻意的：
設計稿只給了這一種底部樣式，共用元件跟著它走，全站才會一致。

⚠️ **`ProfileCard` 的頭像刻意不給 `priority`**：品牌列 / 個人資料卡 / 邀請卡在桌機與
手機兩種版型各 render 一次（互斥的 `hidden` / `lg:hidden`），給了會 preload 兩次。

導覽用 `<li>` 不用 `<a>` —— 頁面都不存在，做成連結會讓鍵盤使用者 tab 到
一個按了沒反應的東西。

## My Schedule 週曆

> **2026-09-22 接真資料**：`ScheduleBoard`（client）自己打 `GET /api/me/schedule?from&to`（`src/schedule/client.ts`），
> 一次三週、切週在範圍內只篩選、超出才重打；起始週用 `useSyncExternalStore`（server snapshot null → 骨架，
> client 才算本週），不再由 server 傳 `initialWeekStart`。`fakeSchedule.json` / `getFakeSchedule` 已刪。
> **「開放時段」按鈕與黃色 open 卡拿掉**（v1.0 邀請制留下的概念，房主制下沒有角色），`SlotKind` 剩 hosted / session。
> **格子改 10 分鐘一格 12px**（`SLOT_MINUTES = 10`、`SLOT_HEIGHT = 12`）：房只有 20 / 40 / 60 分鐘，30 的格線畫不出 20 與 40；
> `SlotCard` 依長度決定畫幾行（20 分只有標題、40 加時間、60 才有語言列與人數）。
> ⚠️ 修了一個舊 bug：卡片的 gridRow 原本寫「起始格 + 1」，但第一列是表頭，所有卡都畫早了一格（30 分鐘）；現在是 +2。
> 跨當地午夜的房裁在當天底。seed 有 5 間 SEED* 房（見 `_dev/dev-accounts.md`）。
> **開房 Dialog `Schedule/HostRoomDialog.tsx`**（client，住在 ScheduleBoard 標題列，要拿 onCreated）：標題 / 日期 / 開始時間（:00 / :30 的 select，
> 今天已過的時間灰掉）/ 時長 / 人數 / 語言方向三組藥丸（Segmented）。用 Dialog 的**受控模式**：每次打開重算預設值
> （下一個至少 15 分鐘後的半點、方向 = 母語 → 學習語言）。前端只擋「時間已過」，重疊 / 驗證看後端錯誤碼顯示 `schedule.host.*` 文案。
> 建好：toast、新房塞進已載入的 slots、可見週切到那間房的週（範圍外則切週自然重拉）。欄位樣式抄設定頁的 INPUT 字串（那邊沒匯出）。
> **卡片詳情 `SlotCard`（client，受控 Dialog）**：打開才打 `GET /api/rooms/:code` 拉成員（含房主、含自己標「（你）」），
> 載入中依人數畫骨架。我開的、還沒開始的房有「取消聊天室」，同框再問一次才送 `POST /api/rooms/:code/cancel`，
> 成功 toast + 卡片從 slots 移除。「還沒開始」在打開那一刻算進 state（render 裡不能 `Date.now()`，React Compiler 的 purity 規則）。
> **黃卡回來了、語意換掉**（2026-09-22 使用者：「開房後其他人要能看到，在日曆上加入」）：黃 = 別人開的、還有位、
> 我還沒申請過、不撞我任何一張卡的房（`GET /api/rooms?from&to`）。**重疊的併成一張卡**「N 間可加入」（`openSlots()`，
> 同一天、時間有交集就串），`OpenSlotCard` 點開：一間直接「要加入嗎？」，多間先列清單再選。申請 → `POST /rooms/:code/join`
> → 我週曆多一張**綠虛線「申請中」**卡（status requested），黃卡因重算自動消失。
> 申請中的卡點開：等房主同意 + 取消申請（`POST /rooms/:code/leave`）。房主的卡點開多一段「申請加入」名單，
> 同意 / 拒絕（`POST /rooms/:code/requests/:userId { decision }`），回新的詳情直接換掉。
> 板子的 Loaded 分 `mine`（MineSlot[]）與 `open`（OpenRoom[]），黃卡每次 render 從兩者重算。
> 三種卡的 grid 位置共用 `gridStyle()`。我加入的房還沒有「退出」（API 有，UI 沒露）。
> 黃卡選到一間就打 `GET /api/rooms/:code`（已放寬給所有登入的人讀）拿最新人數與成員列在申請框裡，滿了鎖按鈕（使用者 2026-09-22）。
> 「返回清單」是有底色的藥丸（跟 ✕ 同灰）。
> 以下是原本靜態 mock 時期的紀錄，數字（48 格 / 34px / 1632px）已過時，其餘決策仍有效。


**自己畫，不用日曆套件**（2026-08-27 決定）。關鍵理由：**這個週曆沒有事件重疊**，
每格最多一張卡，而重疊佈局演算法正是套件最主要的價值。也沒有拖拉、月/日視圖切換、
跨日或全天事件。附帶好處是整區維持 Server Component（套件幾乎都 client-only），
日期用原生 `Intl` 還自帶 i18n（英文 Mon / May 19，中文自動變週一 / 5月19日）。

檔案在 `Components/Profile/Schedule/`：`ScheduleSection`（外框 + 標題列 + ‹ ›）、
`ScheduleGrid`（Grid + 表頭 + 時間軸 + 初始捲動）、`SlotCard`（三種變體共用）、
`ScheduleLegend`、`scheduleData.ts`、`week.ts`、`fakeSchedule.json`。

⚠️ **`add`（虛線的「新增時段」卡）已移除**（使用者 2026-08-27：「我評估後覺得有點多餘」）——
標題列本來就有一顆「開放時段」，格子裡再放一張同義的虛線卡是重複的入口。
`SlotKind` 因此剩三種，`SlotCard` 的 `cancelLabel` 這條 props 鏈也一起收掉。

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

全天展開 1632px，不捲的話打開只看到空白凌晨。由 `Schedule/InitialScroll.tsx`（client，不 render
東西）在 **useLayoutEffect** 裡設 `scrollTop`（2026-09-21 改的）。

⚠️ 原本是 inline `<script>`（跟 HTML 一起到、解析到就執行、零閃爍），但 **client 端導頁時
React 用 DOM API 建的 `<script>` 不會執行**，還會在 Console 報紅字 —— 登入後的 `router.push`
與側邊欄的 Link 都會踩到；以前沒發現是因為都直接打網址進 /home。
layout effect 在繪製前跑，client 導頁零閃爍；整頁載入要等 hydration 才捲，JS 載入前會短暫看到凌晨，
那是 React 的天性。要零閃爍得用 `useSyncExternalStore` 的 server snapshot 只在 SSR 輸出 script，
目前覺得不值得。

⚠️⚠️ **不能只設一次。** Next.js **dev 模式的 CSS 是用 JS 注入的** —— effect 執行那一刻
`max-h` 還沒套用，`scrollHeight === clientHeight`，`scrollTop` 被瀏覽器 clamp 成 0。
production 的 CSS 是 head 裡的 blocking `<link>`，第一次就會成功。
**這是「dev 壞、prod 好」的差異，最難察覺。**

解法：先試一次，判斷條件用 `scrollHeight > clientHeight`（能不能捲的直接證據，
不去猜 CSS 何時注入完）；不成就用 `ResizeObserver` 等容器真的變可捲動再設，
設完立刻 `disconnect`。比賭 `requestAnimationFrame` 的單一時機可靠。

### 切週與資料模型

**週切換必須是 client**：靜態匯出沒有伺服器、URL query 不會觸發新的 SSG，
換一週只能在瀏覽器端重算。範圍縮到最小 —— `ScheduleSection`（server）只負責
Card 外框與圖例，`ScheduleBoard`（client）承接 header 與網格。

⚠️ **起始週由 server 傳入，client 只做 offset 位移。** 兩邊各自呼叫
`currentWeekStart()` 會 hydration mismatch —— client 算的是「使用者的今天」、
server 算的是「建置那天」。

⚠️ **`Slot` 用絕對日期 `date` 不用「週內第幾天」。** 資料一次抓一個範圍回來
（使用者 2026-08-27 決定：切週**不重新打 API**），相對索引跨不了週，
三週的資料混在一起會分不出哪筆屬於哪週。`slotsInWeek(slots, weekStart)` 依週篩選
並換算欄位索引。JSON 裡仍用 `week`（-1/0/1 相對位移）+ `day` 描述，改資料時好讀，
轉成絕對日期在 `buildSlots()` 做。

header 移進 `ScheduleBoard`（日期範圍要跟著切週變），但**兩顆動作按鈕當
`ReactNode` 傳進去** —— 內容仍是 server 渲染的，裡面 Dialog 的 trigger 不用跟著搬。

### 日期範圍的格式（踩過）

⚠️ **不要用 `Intl.formatRange`。** 它在中文語系一律輸出「2026/8/24至2026/8/30」——
用「至」連接、不簡化重複的月份、年份還出現兩次。那是 CLDR 的中文範圍規則，改不掉
（試過 short / long / numeric / 2-digit / dateStyle 全部一樣）。

解法：單獨格式化兩個日期再自己串 `–`，中文才會是正常的「8月24日 – 8月30日」。
代價是失去英文的自動簡化（`Aug 24 – 30`），換得兩種語系一致。

年份**分開回傳**、用淡一階的色排在後面，不接進字串 —— 這樣不必決定中文該用
逗號還是別的標點來連接。跨年那週顯示「2026 – 2027」。

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

## Find Conversation Monsters（已完成）

**2026-08-27 完成。** 檔案在 `Components/Profile/Monsters/`：
`MonstersSection`（server，只餵字典與假資料）、`MonstersBoard`（client，狀態層）、
`MonsterFilters`、`MonsterCard`、`MonsterPanel`、`monstersData.ts`、`fakeMonsters.json`。

### 與週曆不同：整區都在 client

週曆只有「切週」需要互動，外框與圖例留在 server。這裡的標題列、格狀、面板
**全部**跟著篩選與選取變動，能留在 server 的只剩一個 Card 外框 ——
拆出去換來的是一堆 props 穿越，所以整塊進 client。

**選中的人由 id 推導，不另存物件**：`selectedId` 存 id，物件從**篩選後**的清單找。
「篩掉正在看的那個人」因此會自然收起面板 —— 存物件的話要多寫一個 effect 比對並
清空，而 effect 清 state 一定是渲染兩次。

### 詳情面板：一個節點兩種版型（沒有走 Dialog）

`xl` 以上是格狀右側的常駐欄位（寬 `w-66`，跟側邊欄同寬）；`xl` 以下是
`fixed inset-x-3 bottom-3` 的浮動面板 + 遮罩。

⚠️ **刻意不用 Dialog。** `showModal()` 是 JS 呼叫，媒體查詢擋不住它 —— 要嘛在
effect 裡自己 `matchMedia`（把斷點複製一份到 JS，兩邊遲早漂移），要嘛把面板內容
渲染兩次。用 CSS 換 position 就好：一份內容、一個節點、斷點只存在於 CSS。
代價是少了 `<dialog>` 的焦點鎖與 inert，**Esc 關閉在 `MonstersBoard` 補上**。
另外**沒有鎖背景捲動**（`globals.css` 的 `body:has(dialog[open])` 對它無效）。

⚠️⚠️ **`relative` 與 `fixed` 不能掛在同一個元素上。** Tailwind 的 position utility
同屬一組、輸出順序固定（static → fixed → absolute → relative → sticky），
**永遠是 relative 贏**，跟 class 寫的先後無關。所以定位用的 `relative` 放在
**內層 div**，Card 只負責 `fixed` / `xl:static`。用 `xl:static` 而非 `xl:relative`
也是同一個考量：static 會忽略 `inset-x` / `bottom`，不必補一排 `xl:inset-auto`。

⚠️ 遮罩 `z-40`、面板 `z-50` —— 要壓過 TabBar 的 `z-30`，不然暗幕之上會浮著一條
亮的導覽列。

沒選人時桌機顯示提示（`hint.title` / `hint.note`）而不是整個消失 ——
欄位一下有一下沒有，旁邊格狀的寬度就會跟著跳。

### 格狀與卡片

`grid-cols-2 sm:3 md:4 2xl:5`。5 欄只在 ≥1536px 出現（設計稿 1448 + 瀏覽器外框），
其餘寬度 4 欄比較不會讓卡片胖到失衡。

⚠️ **卡片上的頭像沒有圓底** —— `Avatar` 新增 `circle` prop（預設 `true`，既有呼叫端
不受影響）。十張並排時，十個淡紫圓會變成畫面上最搶眼的圖形，蓋過怪獸本身。
線上點也因此畫在**卡片右上角**，不是 Avatar 自己那顆（那顆是貼著圓緣定位的）。

語言徽章**母語在前、學習中在後** —— 順序帶著資訊：第一顆才是你能跟他練到的語言。

狀態列兩種擇一：有開放名額顯示名額（比較急迫、可以馬上進去），否則顯示下一個有空
的時間。整點時**不輸出分鐘**（`formatHour`）—— 設計稿寫的是「Free at 4 PM」。
詳情面板則用週曆的 `formatTime`（帶分鐘），也跟設計稿一致。

### 篩選

兩個下拉用原生 `<select>` + `appearance-none` 自己畫箭頭 —— 手機會叫出系統選單、
鍵盤與螢幕閱讀器都是現成的。「Online now」用 `role="switch"`，它不是表單欄位而是
立刻生效的開關。

⚠️ 語言篩的是**對方的母語**，下拉的 aria-label 因此寫「對方的母語」而不只是「語言」。

### 假資料的調整

⚠️ **每隻怪獸都補了 `freeAt`**（原本與 `slotsOpen` 二選一）。面板的「Next available」
是固定欄位，少了它面板高度會隨著選誰而跳動。`slotsOpen` 改成純選填的額外資訊。

Nina 是唯一 `online: false` 的 —— 「Online now」開關才有東西可篩。

字典的 `{count}` / `{time}` 用 `fill()` 這個五行的 replace 代入，沒有為此裝 i18n 套件。
英文的 1 slot / 2 slots 靠 `slotOpen` / `slotsOpen` 兩個 key，中文兩者相同。

### 沒做的

⚠️ 設計稿底部的「**Show more monsters ▾**」**沒有做** —— 假資料就只有 10 隻、
格狀已經全部攤開，那顆按鈕按下去無事可做。等 API 有分頁再補。

面板上三顆按鈕（下次有空、查看行程、打聲招呼）是純視覺，跟側邊欄七項、
週曆的「開設聊天室」同一個處理。

字典的 `profile.soon.schedule` / `profile.soon.monsters` 已刪除（placeholder 沒了），
`soon.note` 仍在用（週曆 Dialog 的內容）。

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

**How to apply:** 個人首頁的四個區塊都做完了。剩下的是**未定**那節（Logo 識別）、
設計稿的「Show more monsters」等分頁 API，以及登入/註冊頁與設計稿的落差清單。
