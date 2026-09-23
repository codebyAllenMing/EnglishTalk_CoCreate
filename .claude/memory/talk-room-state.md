---
name: talk-room-state
description: 對話室 /room/[code] 的實作狀態、與使用者定案的產品規則、假資料與待接後端的邊界
metadata:
  type: project
---

**2026-09-21 完成靜態 mock。** 設計稿 `assets/design/Talk Room.jpg`。
產品規則見 vault 的 `conversation-session` / `room-booking-model` / `tech-inventory`。

## 使用者拍板的（2026-09-21）

- **路由 `/[lang]/room/[code]`**。靜態匯出只能建出 `generateStaticParams` 列的房號
  （假房 `HAPPY123`），dev 任何房號都開得起來、內容都是假房；其他房號等有 SSR 的部署。
  **路由形狀已經是對的，部署決策不被這頁綁架。**
- **白板先佔位**（SVG 幾筆）。盤點 C2 不自建，Excalidraw / tldraw 待選，選了就換 `<Canvas>`。
  沒有為 mock 寫 canvas 畫筆 —— 那是會被丟掉的程式碼。
- **計時器**：開房選 20/40/60，系統對半切兩桶。一次一桶倒數、⇄ 任何人都能按、沒跑的暫停；
  跑到 0 自動換另一桶，兩桶都 0 結束。手動換不重置，總時長永遠等於開房設的。
  **按 ⇄ 不是立刻換，先倒數 5 秒**（`SWAP_DELAY_MS`；「講到一半被切掉很突兀」），倒數中再按是取消；
  倒數期間桶先空了就走自動換、排程作廢。排程用時間戳存（`swapAt`），在 `settle()` 裡結算。
- **Word Bank 方案 B**：點**別人的訊息泡泡**開 SaveWordDialog（**自己的泡泡不能點**，使用者 2026-09-22：「自己儲存自己的感覺有點怪」；畫成普通泡泡沒 hover），使用者自己填單字（必填）、
  詞性、意思（選填），原句直接當例句。**沒有星號**（訊息旁與面板列都沒有，使用者：
  「都儲存成字典了，星號 UX 怪怪的」）、存過也不標記、面板列只有刪除。
  這是盤點 B6（LLM 抽字）的前置：LLM 進來只是預填欄位，同一個對話框。
- **面板只顯示這場存的字**；完整字典是側邊欄的 Word Bank 頁（未做）。
- **Leave room 先問**（Dialog 確認）才回 `/home`。
- **視訊格的背景是示意**：那個 16:9 框就是 `<video>` 的位置，鏡頭關閉時顯示頭像 ——
  所以 mock 的畫面就是 camera off 的畫面，不是丟掉的東西。
- 手機版：視訊 2×2 維持、ControlBar `fixed` 底部、右欄三塊收成 tab（`SidePanels`）、
  白板留在流裡可收合。

## 結構

`Components/Room/`：`RoomShell`（server 殼：品牌 + 房間資訊 + TopBar + Leave；
**不用 AppShell**，進了房不該有導覽把人帶走）、`RoomProvider`（client，**唯一的狀態層**）、
`LanguageTimer`、`VideoGrid`、`ControlBar`、`Whiteboard`、`TopicCard`、`Chat`、
`SaveWordDialog`、`WordBank`、`SidePanels`、`LeaveRoomButton`、`roomData.ts`、`fakeRoom.json`。

⚠️ **這一頁沒有任何一塊能留在 server。** 接 LiveKit / WebSocket 時只換 `RoomProvider`
的資料來源，畫面元件全部從 `useRoom()` 拿資料、不碰網路。

⚠️⚠️ **計時器不存「剩幾秒」每秒減一 —— 存「在跑那桶從哪一刻（`since`）開始、當時剩幾秒」，
剩餘時間隨時用牆鐘算。** 使用者 2026-09-21 發現切分頁後倒數停住：背景分頁的 `setInterval`
會被瀏覽器節流到一分鐘一次，減一的計時器回來就少好幾分鐘。**不是用 Worker 解**
（worker 也會被節流、而且一樣只是在數 tick），是把 interval 降級成「重繪觸發器」，
數字全部從 `Date.now()` 推；另外接 `visibilitychange` 回前景那一刻立刻結算。
結算（`settle()`）換桶時另一桶的 `since` 是「前一桶剛好歸零的那一刻」不是 now ——
背景那幾分鐘要算進另一桶。**「該換了」的判定只在 `settle()` 一處**，接後端時 server
廣播 `switchAt` 就是換掉它的依據，`LanguageTimer` 不動。
`since` 用 `useState` 初始化函式填 `Date.now()` 不會 hydration mismatch：
第一次 render 時 `now` 是 null、畫面不看 `since`。

P2 的（白板、反應、話題卡、單字庫）各自獨立一個檔，延後時整檔拿掉。

## `Dialog` 加了受控模式

`open?: boolean` + 既有的 `onClose`，`trigger` 變成選填。用在「一份清單、每列都能開
同一個對話框」（聊天訊息存單字）—— 每列各掛一個 Dialog 會在 DOM 塞 N 份，改成清單只記
「選中哪一則」。⚠️ 給 `open` 就要給 `onClose` 同步回來，不然 Esc 關掉後 state 還是 true。
對已開的 dialog 再 `showModal()` 會丟 InvalidStateError，effect 裡先看 `el.open`。

`SaveWordDialog` 的表單用 `message.id` 當 key，換一則就換一份全新 state。
底部按鈕在表單裡（要讀表單 state），給 `footer={<span />}` 壓掉 Dialog 預設的。

## 假資料與細節

- `fakeRoom.json`：四人（allen 是 me、zh）、四則訊息、六張雙語話題卡、三個字。話題顯示**現在輪到的語言**那個版本。
- `startsAt` 是本地時間字串，`parseLocalDateTime` 不用 `new Date(iso)`（會被當 UTC）。
- 訊息時間存 `"HH:MM"`，沿用週曆的 `toMinutes` / `formatTime`。
- 聊天輸入與存單字都有 IME 守門（`isComposing || keyCode === 229`）。
- `LanguageTimer` 正在倒數的那半實色、另一半淡下去 —— 設計稿兩邊都實色，但那樣看不出
  現在輪到誰講。它的圓徽章不用 `LangBadge`（那個底色寫死淡色版）。
- 反應**只有按了才出現**、三秒消失、每人各自計時（使用者不要預先掛著的假反應）。
  自己那格有一圈紫框標記。
- **時間到（兩桶都 0）→ 房間結束**（使用者 2026-09-21）：`RoomEndedRedirect` 用 `router.replace`
  換到 `/home?ended=房號`（replace 不用 push：死房不該留在歷史），首頁的 `RoomEndedNotice`
  讀 `?ended=` 彈「XXX 房間的對話已結束」，關掉時把 query 清掉。彈窗放首頁不放房間 ——
  「背景就被彈跳到 home」，房間結束就不該還站在房間裡。靜態站沒有 session，URL 是唯一能
  跨頁帶狀態的地方。⚠️ `useSearchParams` 在靜態預渲染的頁面必須包 `Suspense`。
  評分等結束後流程仍未定（vault `rating-mechanism`）。
- 未做：emoji 選擇器（純視覺）、白板工具列（純視覺）、ControlBar 的 › 子選單。

## 接後端的定案（2026-09-23 討論，未建）

- **進房的門一定在 server，兩層缺一不可**（使用者：「你有擋就好，這很容易被忽略」）：
  1. 頁面載入打 `GET /api/rooms/:code`：404 / 410 cancelled / `status` none 或 requested → 導回 home；
     approved（含房主）才看時間窗 `startDate − 5 分鐘 ~ endDate`，太早顯示倒數、過了走 `?ended=`。**這層是體驗。**
  2. **WS 握手（白板、聊天）與 LiveKit 簽 token 各自再查一次 `RoomMembers` approved + 時間窗**，不是就 4403 斷線 / 不簽。
     **這層是安全。** 靜態 HTML 本來公開，直接打網址擋不住也不用擋，門在 API 與 WS。
- **白板用 tldraw + `@tldraw/sync`**，浮水印使用者接受。server 端 `Map<code, TLSocketRoom>` 跑在 api 的 Node 行程
  （同一個 `ws` server 按路徑分流：`/api/rooms/:code/whiteboard`、之後聊天 `/api/rooms/:code/live`），
  prod 換官方 DO 範本（`idFromName(code)`）。第一個人連進來才建（lazy），`endDate` 到或沒人一段時間就銷毀，
  內容只活在記憶體。圖片上傳先關。
- 房號唯一真相是 `Rooms.code`，網址與 Map 都只是拿它當鍵，沒有第二份登錄表。
- 隔離模型 = pub/sub：房號是 topic，每個 topic 各自一份 store 與 socket 清單，不是一條大廣播加 if。
- **白板已建（2026-09-22）**，是獨立模組（使用者：「白板要變成一個模組」）：
  - 後端 `packages/whiteboard`（`@monstertalk/whiteboard`）：`createWhiteboardHub()` = `Map<code, TLSocketRoom>` 的生命週期
    （lazy 建、最後一人離開 60 秒銷毀、endDate + 5 分鐘銷毀）；`./node` 的 `attachWhiteboardServer(server, { hub, origin, authorize })`
    掛在 http server 的 upgrade 上，路徑 `/api/rooms/:code/whiteboard?sessionId=`。套件不認識 auth / DB，誰能連由 `authorize` 回呼決定。
  - api：`createApp()` 改回 `{ app, auth, db }`；`index.ts` 用 `instanceof http.Server` 收窄後掛白板，authorize =
    `verifySession(cookie)` → `rooms/access.ts` 的 `roomAccess(db, userId, code)`（**進房規則只寫這一處**：存在、未取消、approved、
    `startDate − 5 分鐘 ~ endDate`；`ROOM_ENTRY_LEAD_MINUTES` 在 packages/db）→ 401 / 403 / 404 / 410。ws 測過六種情況都對。
  - 前端 `Components/Room/Whiteboard/`：`index.tsx`（外框 + 收合，`next/dynamic` 關 SSR）、`Board.tsx`（`useSync` + `<Tldraw>`，
    store.status error 就顯示 `board.unavailable`）、`assets.ts`（上傳關掉）。房間頁只傳 `code`。換引擎只動 Board.tsx。
  - `src/api.ts` 多 `wsUrl()`（http → ws）。seed 多 `SEED09`：跑 seed 那一刻起 60 分鐘、allen 房主 / luna bobby 已加入 / mia 申請中，測進房用。
  - **入口已接（2026-09-22 晚）**：`GET /api/rooms/:code/entry`（roomAccess 的答案 + 房間 + 成員含母語與 me）。
    前端 `Components/Room/RoomGate.tsx`（client）載入時打它：ok → 用真成員組 Room 掛 RoomProvider；notStarted → 倒數到
    opensAt 再問一次；ended → `/home?ended=`；其餘顯示原因 + 回首頁（字典 `room.gate.*`）。頁面結構變成
    `RoomGate → RoomProvider → RoomShell（server 殼）`，標題與三顆 chip 拆成 `RoomHeading`（client，讀 useRoom）。
    `Participant` 多了 `avatar`（id 現在是 Users.id）。聊天 / 話題 / 單字仍 mock，mock 訊息的 from 輪流指到真成員。
  - 白板的 tldraw user 用登入者，**兩個地方都要給**（踩過：只給一個，自己看是真名、別人看是「新用戶」）：
    `useSync({ users: { currentUser: atom(UserRecordType.create({ id: createUserId(userId), name, color })) } })` 決定
    **廣播給別人的 presence**（沒給就讀 localStorage 的預設偏好）；`useTldrawCurrentUser` + `<Tldraw user>` 只是編輯器
    自己的偏好（語系、自己在清單裡的名字）。顏色由 userId 雜湊固定。
- **https**（使用者 2026-09-22 提醒）：localhost 不用；手機連電腦時白板 / 聊天 http 也通，但**視訊的鏡頭麥克風要 secure context**。
  https 頁面也不能開 ws://，所以到視訊那輪 web 與 api 要一起上 https：Next `next dev --experimental-https`（mkcert 自動產憑證，
  手機要裝 mkcert 的根憑證）或 Cloudflare Tunnel 配自己網域（兩個子網域、cookie same-site、WS 通）。程式碼全靠 env
  （`API_ORIGIN` / `WEB_ORIGIN` / `NEXT_PUBLIC_API_ORIGIN`），不用改。
- **聊天已建（2026-09-22 晚）**，模組 `packages/live`（`@monstertalk/live`），跟白板同一個模型：
  - `createLiveHub()` = `Map<code, Room{ clients, history }>`；**不做閒置銷毀**，只在 endDate + 5 分鐘銷毀（使用者定案：
    房間開著的期間歷史完整；Zoom / Meet 是晚進來看不到，我們刻意不照它）。歷史 200 則、單則 500 字、只活在記憶體。
  - 協定在 `src/protocol.ts`：client `{ type: "chat", text }`；server `hello { you, online, history }` / `chat { message }` / `presence { online }`。
    之後計時器 switchAt 與反應走同一條，多加 type。
  - `./node` 的 `attachLiveServer(server, { hub, origin, authorize })` 路徑 `/api/rooms/:code/live`，跟白板的 attach 並存；
    authorize = verifySession → roomAccess → `roomUser()`（名字 / 頭像 / 母語）交給 hub 當 from。
  - 前端 `Components/Room/useLive.ts`：hello 前 connecting（輸入框鎖）、退避重連 1/2/4/8 秒、連續五次失敗 error（「連線中斷，請重新整理」）；
    送出不先塞本地，等廣播。`RoomProvider` 的 messages / sendMessage / online / chatStatus 來自它，`Chat.tsx` 只多鎖輸入框；
    VideoGrid 沒連線的人淡化加「未連線」。RoomGate 組 Room 時 messages 是空的。
  - 協定用 ws 腳本測過：hello / presence / 廣播含自己 / 空白與非 JSON 丟掉 / 申請中 403 / 晚進來拿到歷史 / 離開後 presence 更新。
  - ⚠️ 測試時發現使用者的 `dev:api`（tsx watch）不在了，health 連不上；我起了一個 60 秒的臨時 api 跑測試後殺掉。
  - ⚠️⚠️ **StrictMode 雙跑 effect 的 socket ref 坑**：第一條 socket 的 `onclose` 在第二條接上之後才觸發，無條件
    `socketRef.current = null` 會蓋掉活著的那條 —— 畫面顯示已連線、送出卻沒反應。要 `if (socketRef.current === socket)` 才清。
    Node 腳本測不出來（沒有 StrictMode），只有瀏覽器 dev 會中。
  - Chat 泡泡的頭像要用 `participant.avatar`，不是 id（id 已經是 Users.id）。
- **單字接 DB 了（2026-09-22 建）**：`Words` 表（見 [[data-model-decisions]]），API 用路徑分範圍（[[feedback-api-routes-not-query]]）。
  `RoomProvider` 進房打 `GET /api/rooms/:code/words` 拿這場的字，`saveWord` 是 async 回 `SaveWordResult`（存進 DB 才進面板），
  `removeWord(id: number)` 軟刪成功才移除。`SaveWordDialog` 的 pos 是 enum id（`WORD_POS` 在 `src/words/client.ts`，跟 db 同一份手抄），
  duplicate 時框不關、顯示 `saveWord.duplicate`。`fakeRoom.json` 的 words 拿掉、`Room` 型別沒有 words 了。
  用 curl 驗過：401 / 409 duplicate（含大小寫與前後空白）/ 400 各欄位 / 403 非成員 / 404 不存在 / 刪別人的 404 / 刪過再存是新列。
- **計時器同步（2026-09-22 定案並建好）**：權威時鐘在 server，走**同一條** `live` WS（使用者：「一次開太多 ws 對瀏覽器並不太友善」），
  用訊息的 `type` 在後端分流。定案：
  - 房間 `startDate` 自動起跑，不管有沒有人進來；since = startDate，總長 = durationMinutes 對半。
  - **先跑「要學習的」那一語 = roomType 的 `to`**（開房表單預設 from = 房主母語、to = 房主學習中；zh → en 的房先跑英文）。
  - ⇄ 任何人都能按、全房同步、5 秒緩衝；再按一次取消（誰按都行）。
  - 協定：client `{ type: "swap" }`；server `timer { timer }`，`hello` 多帶 `timer` 與 `now`（server ms，client 算時差）。
  - `settle()` 搬到 packages/live 共用：server 收 swap 先結算再改；server 也要在 swapAt / 桶歸零那一刻自己結算並廣播；client 用同一支從牆鐘推。
  - `authorize` 多回 startDate / durationMinutes / 先跑的語言；api 重啟就重建成「從 startDate 跑到現在、沒切過」。
  - 前端 `LanguageTimer` 不動，`RoomProvider` 的 swapLang 改送訊息、timer 狀態改從 useLive 來。
  - 做法：純邏輯在 `packages/live/src/timer.ts`（**不能 import 任何東西**，web 直接吃這份 TS 原始碼），
    exports 加 `./timer`；web 加 `@monstertalk/live: workspace:*` + next.config `transpilePackages`（第一次讓 web 相依 workspace 套件）。
    hub 每間房多 `timer` + `timerTimer`（setTimeout 到 nextEventAt 自己結算並廣播）。`Room` 型別多 `firstLang`（entry.room.to）。
    `leftOf` 在 since 之前不倒數（開始前 5 分鐘進房看到整桶）；`requestSwap` 開始前忽略。
  - 驗過：ws 腳本（兩人同時收到 swapAt、再按取消、5 秒後 server 自己換邊並廣播、晚進來的人 hello 拿到換邊後狀態）+ 純函式邊界案例。
  - ⚠️ dev 坑：hub 的房是第一個人連上時用當時的 DB 列初始化，**重跑 seed 後要重啟 api**，不然 SEED09 的計時器停在舊時間。
- **離開房間的攔截（2026-09-22）**：使用者誤按上一頁回到 home 後討論。只做 `beforeunload`（重新整理 / 關分頁 / 改網址，瀏覽器原生對話框，
  放在 `RoomProvider`、結束後拿掉）；**不做上一頁的 history 陷阱**（手機 Safari 滑動返回會先走再跳回、壞掉前後頁語意），
  改以「回去很容易」補：狀態都在 server，回 home 再點進去是原樣；待辦是週曆卡的「進入房間」按鈕 + home 頂部「有房間進行中」橫幅。
- https 前置 2026-09-22 做完（dev 一律 https，見 [[auth-backend-plan]]）。視訊三條路（mesh / LiveKit Cloud / Cloudflare Realtime）已攤開，我傾向 mesh（訊號走 live WS 加 `rtc` 轉發、Google STUN、跨網路再加 Cloudflare 免費 TURN），等使用者決定。
- **視訊 2026-09-22 定案並建好：Cloudflare Realtime Serverless SFU**（使用者看完評估表選的；vault `video-engine-options.md` 已 confirmed，MOC 更新）。
  訂閱綁卡、免費 1,000GB/月（SFU 與 TURN 共用一池），App ID / Secret 在 `.env.local` 的 `CF_REALTIME_*`。做法：
  - api `routes/video.ts`：代打層，client 不碰 Secret。`POST …/video/sessions`、`POST …/sessions/:sid/tracks`（推 local + offer / 拉 remote）、
    `PUT …/renegotiate`、`PUT …/tracks/close`。每條過 `roomAccess`，有 sid 再驗「我在這房開的」（記憶體 Map，TTL 3 小時），拉別人的 session 必須同房。
    沒設定回 503 `unavailable`。上游錯誤 502 原樣轉回（Cloudflare 的 `errorCode` / `errorDescription`）。
  - `packages/live` 協定多 `media`：client `{ type: "media", media: { sessionId, mic, cam } }`，server 廣播 `{ type: "media", user, media }`，hello 帶 `media` map；
    hub 只轉發與記住（每個 client 最後一次），媒體本身在 Cloudflare。
  - web `Video/useSfu.ts`：一條 PeerConnection 雙向共用（STUN `stun.cloudflare.com:3478`、max-bundle）。進房 getUserMedia（640×360）→ 開 session → 兩條 sendonly
    transceiver、trackName = kind → 等 ICE connected → 廣播 media。別人的 media 進來就拉 audio / video（Cloudflare 給 offer、我答 answer → renegotiate），
    離線或換 session 就 `tracks/close force`。**所有 SDP 往返排隊（queue）**，Cloudflare 一次只能一個 renegotiation。
    **ontrack 靠 mid → userId 的對照分流，要在 setRemoteDescription 之前登記**。mic / cam = `track.enabled` + 廣播，關鏡頭不關 track（免 renegotiate）。
    拒絕權限 / 未設定 / 連不上都不擋房間，VideoGrid 上方畫提示。
    **三個 race 的對策**（使用者切語言時撞到 Cloudflare 的 `not_found_track_error` / `empty_track_error`）：
    (1) 發布端 ICE 連上後再等 `getStats` 的 outbound-rtp 兩種 kind 都 packetsSent > 0 才廣播 sessionId（最多 5 秒）；
    (2) 拉到這兩種錯退避重拉（0.5 → 8 秒五次，`c.retries` 排程、到點再進 queue），中間 console.warn、用完才 reportError；
    (3) live WS 從 offline / error 回到 online 就 `restart()`（generation +1，main effect 重跑開新 session）——api 重啟後記憶體的 session 擁有者對照沒了，
    拉流拿到 403 notYourSession 也走 restart；400（api 不認對方的 session）就等對方重新廣播。
  - `VideoGrid`：有串流且 cam 開 → `<video>`（自己靜音 + 鏡像），否則頭像；別人的 `<video>` 在 cam 關時仍掛著（display none）讓聲音繼續。
    遠端聲音被自動播放政策擋（直接開網址沒手勢）→ 蓋一顆「點一下開始」，點了所有 `<video>` 重試 play。
  - `RoomProvider` 的 micOn / camOn / toggleMic / toggleCam 改由 useSfu 管；多 `video` 狀態與 `videoBlocked` / `resumeVideo`。
  - curl 驗過：開 session 201（真的打 Cloudflare）、申請中 403、別人的 sid 403、body 壞 400、拉不存在的 session 400、假 SDP 502 帶 Cloudflare 錯誤、不存在的房 404。
    瀏覽器端的推拉流使用者 2026-09-22 深夜用 allen / luna / bobby 三個帳號實測：畫面互看 OK。
  - 自己那格（「你」）的 mic / cam 圖示是按鈕（使用者：「我點我自己的也一樣點不下去」→ 改成可按，跟 ControlBar 同一個開關）；別人的是純狀態燈。
- **格子放大模式（2026-09-22 建）**：每格**左上角一顆 ⤢ 按鈕**（使用者：「應該要給一個放大縮小的按鈕，而不是點視窗放大」，原本整格可點已拿掉）→ 全寬當主畫面、其他縮成一排 1/3 寬小格，主畫面那顆變 ⤡ 按了回 2×2。純手動、各看各的（`focusId` 只在 VideoGrid 的 state）。
  同一個 grid 改 `grid-cols-3` + 主畫面 `order-first col-span-3`，不搬 DOM 所以 <video> 不重掛。右上角留給「未連線」標與反應泡泡。
  小格在 sm 以下藏兩顆燈、名字縮小；手機預設仍 2×2（使用者同意跟桌機一致）。字典 `room.video.focus / unfocus`。
- **Tunnel 手機測試（2026-09-22 深夜準備好、還沒建）**：設定範本 `_dev/tunnel/config.yml`（一個 hostname `talk.allenmingstudio.com` 路徑分流：
  `^/(api/.*|health)$` → https://localhost:4000、其餘 → https://localhost:6531，都 noTLSVerify）。`apiOrigin()` 遇到非 localhost / IP 的 host 走同 origin；
  next.config `allowedDevOrigins: ["192.168.*.*", "talk.allenmingstudio.com"]`；`.env.local` 的 WEB_ORIGIN 已多列 tunnel 網域。
  **還沒跑的兩條 Cloudflare 寫入指令（要使用者確認）**：`cloudflared tunnel create monstertalk`、`cloudflared tunnel route dns monstertalk talk.allenmingstudio.com`，
  跑完把 id 填進 config.yml，再 `cloudflared tunnel --config _dev/tunnel/config.yml run`。
  → 2026-09-23 使用者自己跑了兩條指令，tunnel 建好（id 3fb86b89…）、DNS 加好，經 tunnel 的登入 / 進房 / SFU session / wss 都驗過。
  ⚠️ **Cloudflare 邊緣會快取 dev 的 `/_next/static` js / css 4 小時**（cf-cache-status MISS → 之後 HIT，瀏覽器也拿到 max-age=14400），
  手機一直拿到舊版、hydration 錯怎麼修都在。next.config `headers()` 對 `/_next/static/:path*` 送 `no-store, must-revalidate`；
  已快取的要開儀表板 Development Mode 或等過期。手機測試 UI 改動前先確認 `cf-cache-status` 不是 HIT。
- 待做：Find Monsters「通話中」用 live 連線當依據。
- 發表當天後端：Mac mini + tunnel（2026-09-23 定，見 [[deploy-mac-mini]]）。

**How to apply:** 接後端前先讀這份確認 provider 的邊界。後端與部署的定案（LiveKit Cloud、tldraw
自架在 Durable Objects、自有 WS、Neon）在 [[auth-backend-plan]]；白板換 tldraw 時只動 `Whiteboard.tsx`。

- **2026-09-23 上線後兩個坑**（都已修）：(1) 白板一片空白 = tldraw 授權，見 [[tldraw-license]]；
  (2) **視訊每 131 秒「重新開啟中」** = Cloudflare 對閒置 WebSocket 的 **100 秒逾時**：live 這條進房後只有 hello 和一次 media，
  沒人打字就沒封包 → 邊緣切線 → useLive 重連 → useSfu「WS 斷過再連上」整個重開視訊。白板的 WS 沒事是因為 tldraw 自己 ping。
  修法：協定加 `ping` / `pong`，useLive 每 30 秒送 ping、hub 回 pong。用兩個無頭 Chrome（CDP 腳本）撐 210 秒驗過不再斷。
  ⚠️ 之後任何經 Cloudflare 的長連線都要有 keepalive；驗證方法是兩個無頭 Chrome 帶 cookie 進房、看 Network.webSocketClosed。
