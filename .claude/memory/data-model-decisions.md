---
name: data-model-decisions
description: DB schema 的定案與延後項（2026-09-22 討論）：個人資訊進 Users、興趣 text[]、頭像 lookup 表、房間與代幣延後；home 各區塊的資料來源對照
metadata:
  type: project
---

**2026-09-22 討論定案。** 背景：帳密登入已通（見 [[auth-backend-plan]]），home 上的東西全是 FAKE_*。
⚠️ 使用者說**「這幾天就要發表」**，簡單做就好，不要為未來擴充多建東西。

## home 各區塊的資料來源

| 區塊 | 來源 |
|---|---|
| 個人資料卡 / 設定頁 | `Users` 的個人欄位 |
| 代幣 / 評價 / 線上 | 代幣 = ledger（延後）；評價 = 評分聚合（P1，延後）；線上 = WS presence，不進 DB |
| 週曆三種卡 | `open` = 我開放的空檔、`hosted` = 我當房主的房、`session` = 我加入的房 → 房間那一場定 |
| Find Monsters | 別人的 Users 欄位 + 空檔 + 房間剩餘名額，**全是推導**，不另存 |
| 對話室 | 成員 = 房間成員；聊天只在房間開著時存（DO / 記憶體）；話題是靜態雙語內容放程式；單字進 DB |
| 邀請卡 | 推薦碼 E3，P2，不建 |

## 已定

1. **個人資訊直接加在 `Users`**（better-auth `additionalFields`），不建 Profiles。
   「帳號」= 登入憑證那側（`Accounts` / `Sessions`），better-auth 本來就分開；Users = 這個人是誰。
   欄位：nativeLang / nativeLevel / learningLang / learningLevel / country / gender / bio / avatarId / interests / timezone。
2. **興趣 `text[]`** 一欄：12 個已知的存代碼（可翻譯）、自由輸入存原文。使用者原本想用 flag（.NET Flags），
   自己也覺得會無限擴大；bitmask 也裝不下設定頁的自由輸入，故不採。
3. **頭像 lookup 表 `Avatars(id smallint, code, name)`**，`Users.avatarId` FK 存數字，前端拿 code 對圖。
   之後擁有權 `UserAvatars` FK 過去；解鎖規則沒定前不建。
4. 表名 PascalCase 複數、欄位 camelCase；時間 `timestamptz` 存 UTC（vault D3）。
5. better-auth 佔了 `Sessions`，對話那一場一律叫 Room，不再出現第二個 Sessions。

## 延後（使用者決定）

- **房間 / 空檔 / 成員**（Rooms、RoomMembers、AvailabilitySlots）：使用者要**換模型另開一場討論架構**，
  討論完再回 Fable 建。討論時的提案草稿：Rooms（code、hostId、startsAt、durationMinutes 20/40/60、
  capacity 2–4、kind、title、langFrom/To、status；時段與人數建後不可改）、RoomMembers（role、
  status requested/approved/rejected/left）、AvailabilitySlots（userId、startsAt、endsAt）。
  ⚠️ 「open 空檔是否獨立於房間」還沒確認。
- **代幣**：獨立表，使用者視為「加裝武器」，等房間建好再上（ledger append-only + 物化餘額，vault E1）。
- 評分 / 通知 / 推薦碼：P1–P2。

## 個人資訊已建（2026-09-22）

- migration `0001`：Users 加 avatarId / nativeLang / nativeLevel / learningLang / learningLevel / country / gender /
  interests text[] / bio，**全部 NOT NULL 帶 default**（better-auth 註冊時只 insert 它認識的欄位，其餘吃 default）；
  `Avatars` 表 + 11 列 INSERT 寫在同一支 migration（prod 也要有，不能靠 seed）。
- better-auth **不宣告** additionalFields：它不讀不寫這些欄位，get-session 的 user 也不會帶（實測只有七個 auth 欄位）。
- 列舉常數（LANGS / LEVELS / GENDERS / COUNTRIES 與長度上限）在 `packages/db/src/schema/profile.ts`，前端另有一份由字典 key 推導。
- API：`GET/PUT /api/me/profile`（requireUser，手寫驗證回 `{ error:"invalid", field }`）、`GET /api/avatars`。
  ⚠️ 改 name 後 better-auth 的 cookie 快取仍是舊名字，前端存完打 `get-session?disableCookieCache=true`。
- 前端：`(app)/layout.tsx` 多掛 `ProfileProvider`（一次 GET，`useProfile()`），ProfileCard / AccountMenu 頭像 / SettingsForm 都吃它，
  載到前畫骨架（靜態 HTML 沒資料）。`FAKE_PROFILE` 只剩評價 / 代幣 / 線上 / 通知四個數字。
- seed 每次重跑會把 11 個人的個人資料覆寫回 mock 值（設定頁亂改後可還原）。

## 線上狀態 presence（2026-09-22 建）

- **不進 DB**：會過期的東西住在 cache。dev 是 api 行程內的 Map（`apps/api/src/presence/store.ts`，介面 `PresenceStore`）；
  prod 上 Workers 要換 **Durable Object**（isolate 間沒有共享記憶體、KV 最終一致），那個 DO 之後就是自有 WS 的 hub。
- key 是 **sessionId** 不是 userId：同一人兩台裝置，A 登出只清 A；讀時按 userId 聚合，active 蓋過 idle。
- 狀態機：active ─(5 分鐘沒動作 / 分頁背景)→ idle；心跳每 60 秒、狀態一變立刻一次；server TTL 兩分鐘沒心跳就消失。
  登出前與 `pagehide`（sendBeacon）立刻 `leave`。
- `Users.lastSeenAt`（migration 0002）只在某人**最後一條 session 消失時寫一次**，給「最後上線 2 小時前」用。
- API：`POST /api/me/presence {state}`、`POST /api/me/presence/leave`、`GET /api/presence` → `{ userId: state }`；
  `GET /api/users` 是別人的公開名單（排除自己、最多 50、無 email / 性別 / 興趣），跟 presence 分開拉（頻率差幾百倍）。
- Find Monsters 已接：名單進頁一次、presence 每 30 秒（背景不拉）。卡片藥丸現在顯示線上中 / 閒置中 / 最後上線 / 尚未上線；
  房間名額與空檔有了之後排在它前面。`fakeMonsters.json` 已刪，同一份資料在 seed 裡。
- 額度：11 人每分鐘心跳一天約 1.6 萬請求，DO 免費一天 10 萬；人數上百靠 WS 取代輪詢。
- 「登入中」≠「在線上」：`Sessions` 一列活 7 天、關掉分頁還在，不能拿它判斷線上。

### 預留：房間內不判閒置（2026-09-22 討論，未做）

使用者的要求：這是**後端機制**，不是前端自報。設計已預留、實作等房間那一場：

- `PresenceStore` 加 `pin(userId, state)` / `unpin(userId)`；`snapshot()` 的聚合改成**有 pin 以 pin 為準**，心跳報的 active / idle 忽略。
  被釘住的人不靠心跳續命，靠房間生命週期解除（離開、時間到、房主結束）+ 保險 TTL（房間時長 + 幾分鐘）。
- 宣告式掛在路由上，對應 .NET 的 action attribute：`presenceHold("inRoom")` / `presenceRelease()` middleware，handler 2xx 後才釘。
- 來源三期、介面不變：mock 房 = 房間路由；LiveKit Cloud = webhook `participant_joined / left`；自有 WS = hub 的連線 / 斷線。
- 前端：第三個狀態 `inRoom`，卡片顯示「通話中」、點換主色、「線上中」篩選三個都算；「打聲招呼」對通話中的人可灰掉。

### 通知（2026-09-22 討論，延後）

通知是純消費者，每一則都是房間 / 訊息 / 評分產生的事件，那些都還沒建，所以先不做；頂部列的鈴鐺與 `notifications: 2` 留假的到發表。
到時候照這個形狀做、不用返工：
- `Notifications(userId, type, refType, refId, payload jsonb, createdAt, readAt)`，**存資料不存文案**，文案前端依 type 從字典組（雙語）。
- 產生端統一走 `notify(userId, type, ref, payload)`，房間 / 訊息路由都呼叫它，之後加 email / push 只改這一處。
- 送達：先 30 秒輪詢 `GET /api/notifications?unread=1`（跟 presence 同節奏），自有 WS 蓋好改推；徽章 = `readAt is null` 的 count，`PATCH /api/notifications/read`。
- 第一則通知會是房主審核制的「申請加入 / 同意 / 拒絕」，房間路由建好時一起掛。
