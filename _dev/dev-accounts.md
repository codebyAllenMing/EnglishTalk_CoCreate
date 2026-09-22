# Dev 測試帳號

> 本機 Docker 的 Postgres 專用（`db:seed` 拒絕非 localhost 的資料庫）。密碼是公開的，**不會也不能**出現在 prod。
> 清單的來源是 `apps/api/src/seed.ts`，改那裡再重跑 seed。

## 啟動

```bash
corepack pnpm dev:api     # api  http://localhost:4000
corepack pnpm dev         # web  http://localhost:6531
```

Docker 沒起來的話：`docker compose up -d`。第一次或 schema 有改：`corepack pnpm db:migrate` 再 `corepack pnpm db:seed`。

## 帳號

密碼一律 **`1qaz@WSX`**。頭像各是自己那隻，興趣與自介照前端 mock（`fakeMonsters.json`）。

| 名字 | 帳號 | 母語 → 學習 | 程度 | 國家 |
|---|---|---|---|---|
| Allen | allen@example.com | 中 → EN | intermediate | TW |
| Bobby | bobby@example.com | EN → 中 | intermediate | US |
| Luna | luna@example.com | EN → 中 | advanced | US |
| Alex | alex@example.com | 中 → EN | intermediate | TW |
| Mia | mia@example.com | EN → 中 | beginner | US |
| Sunny | sunny@example.com | 中 → EN | beginner | TW |
| Tao | tao@example.com | 中 → EN | advanced | TW |
| Yuki | yuki@example.com | EN → 中 | intermediate | US |
| Ryan | ryan@example.com | EN → 中 | beginner | US |
| Nina | nina@example.com | 中 → EN | intermediate | TW |
| Leo | leo@example.com | EN → 中 | advanced | US |

## 還原

在設定頁亂改之後想回到上面的值：

```bash
corepack pnpm db:seed
```

帳號已存在會跳過建立，密碼與個人資料每次都覆寫回上面的值，不刪任何東西。

## 直接看資料庫

```bash
docker exec monstertalk-postgres-1 psql -U monstertalk -d monstertalk -c 'select name, email, "nativeLang", "learningLang" from "Users" order by "createDate";'
```

或 `corepack pnpm db:studio` 開 Drizzle Studio。

## 房間（測週曆用）

`db:seed` 會建 9 間相對**本週**的房（房號 `SEED01`–`SEED09`），每次重跑先刪這五間再建，你自己開的房不動。
以 allen 登入看週曆：

| 房號 | 房主 | 時間（本週） | 長度 | allen 的角色 | 週曆上 |
|---|---|---|---|---|---|
| SEED01 | allen | 週二 20:00 | 40 分 | 房主，luna 已加入 | 紫（你開設的） |
| SEED02 | bobby | 週四 21:00 | 60 分 | 已同意加入（3/4，mia 申請中） | 綠（你的對話） |
| SEED03 | luna | 週六 19:00 | 60 分 | 已同意加入 | 綠 |
| SEED04 | alex | 下週三 20:00 | 20 分 | 申請中（未同意） | 綠虛線「申請中」（下一週） |
| SEED05 | allen | 上週四 12:00 | 20 分 | 房主，沒人加入 | 紫（上一週） |
| SEED06 | nina | 週五 20:00 | 40 分 | 沒關係 | 黃「可加入」 |
| SEED07 | tao | 週六 10:00 | 60 分 | 沒關係（sunny 已加入，2/4） | 黃，跟 SEED08 併成「2 間可加入」 |
| SEED08 | yuki | 週六 10:30 | 40 分 | 沒關係 | 同上 |
| SEED09 | allen | **跑 seed 那一刻**起 60 分 | 60 分 | 房主，luna / bobby 已加入，mia 申請中 | 紫；**進房測試用**，`/zh-TW/room/SEED09` |

進房（白板等即時功能）只在時間窗內、且是子單裡 approved 的人才連得上。SEED09 每跑一次 seed 就重新從「現在」開始，
測白板與聊天前先 `corepack pnpm db:seed`，再用 allen / luna / bobby 開 `/zh-TW/room/SEED09`；mia 是申請中，進不了房。
聊天只活在 api 行程的記憶體：api 重啟訊息就沒了，房間結束 5 分鐘後也清掉。

單字庫：進 SEED09 點任一則聊天泡泡存字，面板立刻出現、重新整理還在；同一個字（不分大小寫）再存會顯示「已經在你的單字庫裡了」；
刪掉後可以再存。mia 打 `/api/rooms/SEED09/words` 會是 403。

審核流程用 **bobby** 登入：SEED02 的詳情裡有 mia 的申請，可以同意 / 拒絕。
申請流程用 **mia** 登入：週曆上 SEED02 是「申請中」（可取消申請），SEED01 / 03 / 06 / 07 / 08 是黃卡。

用 curl 開一間房（先登入拿 cookie）：

```bash
J=/tmp/jar.txt
curl -s -c $J -H "Origin: http://localhost:6531" -H "Content-Type: application/json" \
  -d '{"email":"allen@example.com","password":"1qaz@WSX"}' http://localhost:4000/api/auth/sign-in/email > /dev/null
curl -s -b $J -H "Origin: http://localhost:6531" -H "Content-Type: application/json" \
  -d '{"title":"curl 開的房","startDate":"2026-09-25T12:00:00.000Z","durationMinutes":40,"capacity":3,"roomType":2}' \
  http://localhost:4000/api/rooms
```

用 curl 存字 / 看整本（接在上面登入之後）：

```bash
curl -s -b $J -H "Origin: http://localhost:6531" -H "Content-Type: application/json" \
  -d '{"word":"obsessed","pos":3,"meaning":"really like","example":"I am obsessed with bubble tea.","lang":"en"}' \
  http://localhost:4000/api/rooms/SEED09/words
curl -s -b $J http://localhost:4000/api/me/words
```

pos 是 enum id：1 名詞、2 動詞、3 形容詞、4 副詞、5 片語、6 成語、7 其他。

清掉自己測試開的房（SEED 的留著）：

```bash
docker exec monstertalk-postgres-1 psql -U monstertalk -d monstertalk -c "delete from \"Rooms\" where code not like 'SEED%';"
```

清掉自己測試存的字（Words 表整張是測試資料，沒有別人的）：

```bash
docker exec monstertalk-postgres-1 psql -U monstertalk -d monstertalk -c 'delete from "Words";'
```
