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
