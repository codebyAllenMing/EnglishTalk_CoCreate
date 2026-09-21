---
name: auth-backend-plan
description: 後端第一步（登入 / token / DB / dev 環境）的定案與 2026-09-21 已蓋好的骨架：怎麼跑、踩過的坑、還欠什麼
metadata:
  type: project
---

**2026-09-21 定案並動工。** 帳密登入已在本機 curl 跑通整條（註冊 → 帶 cookie 200 → 無 cookie 401 → 登出 → 再登入）。
背景：四張設計稿的前端 mock 全部完成（見 [[frontend-build-state]]），登入 / 註冊頁已接這個 API（同日）。

## 已蓋好的東西（2026-09-21）

| 位置 | 內容 |
|---|---|
| `packages/db` | Drizzle schema（`src/schema/auth.ts`：Users / Sessions / Accounts / Verifications）、`createDb(url)`（postgres-js）、`drizzle.config.ts`、`drizzle/0000_*.sql` 第一版 migration |
| `packages/auth` | `createAuth({ db, secret, baseURL, trustedOrigins })`、`verifySession(auth, headers)`（給 WS / tldraw 用）、`requireUser(auth)` Hono middleware（401 或 `c.var.user`） |
| `apps/api` | Hono + `@hono/node-server`，port 4000。`/health`、`/api/auth/*` 交給 better-auth、`/api/me` 是受保護路由樣板。`createApp(env)` 不綁執行環境，上 Workers 只換 `index.ts` |
| root | `docker-compose.yml`（postgres:17-alpine + Mailpit）、`.env.example`、`tsconfig.base.json`、scripts `dev:api` / `typecheck` / `db:generate` / `db:migrate` / `db:studio` |

命名：表 PascalCase 複數（用 better-auth 的 `modelName` 對過去，adapter 的 `schema` map key 就是 modelName）、欄位 camelCase（better-auth 預設）。
**Users 只有 better-auth 核心欄位**，個人資料欄位（母語 / 學習語言 / 國家 / 頭像…）刻意沒加，等 schema 那一場。

## 怎麼跑（dev，全 localhost）

```
cp .env.example .env.local        # 填 BETTER_AUTH_SECRET（openssl rand -base64 32）
docker compose up -d              # Postgres 5432、Mailpit 8025
corepack pnpm db:migrate          # 套 migration（改 schema 後先 db:generate）
corepack pnpm dev:api             # tsx watch，--env-file 讀 repo 根的 .env.local
```
前端 6531、api 4000；cookie 在 localhost 不分 port，不需要 tunnel。Mac mini 那條不用。

## 踩過的坑（2026-09-21）

- **pnpm 11 有內建 `minimumReleaseAge`**：drizzle 當天剛發的版本會被擋，pnpm 會自動把 `minimumReleaseAgeExclude` 寫進 `pnpm-workspace.yaml` 放行。我選擇尊重它：退到半年前的 0.45.2 / 0.31.10，不留排除清單。
  ⚠️ lockfile 一旦含了太新的版本，之後 `pnpm install` 會在重解**之前**就中止；解法是 `git checkout pnpm-lock.yaml` 讓新套件重解，web 的鎖定不動。
- `allowBuilds` 新增 `esbuild: false`（tsx 與 drizzle-kit 的傳遞依賴，binary 由 optionalDependencies 提供）。已用 scratchpad 複本跑 `--frozen-lockfile` 全新安裝驗過。
- **tsx 會把 `--env-file` 轉給 Node**，所以 api 的 script 不需要 dotenv。drizzle-kit 只讀 cwd 的 `.env`，`drizzle.config.ts` 用 `process.loadEnvFile("../../.env.local")`（Node 內建，路徑相對於 `packages/db`，透過 `pnpm --filter` 跑就對）。
- better-auth 的 POST 端點**一定要 `Content-Type: application/json` 且有 JSON body**，連 sign-out 也要 `-d '{}'`，否則 415 / 400。
- **沒有 `Origin` header 的 POST 直接 403 `MISSING_OR_NULL_ORIGIN`**（CSRF 保護）。瀏覽器一定帶；curl / Node 測試要自己加。
- cookie 兩顆都是 HttpOnly：`better-auth.session_token`（DB 那列）與 `better-auth.session_data`（五分鐘 cookieCache）。

## 已定（討論時期，仍有效）

| 項目 | 決定 | 理由 / 備註 |
|---|---|---|
| 登入方式 | **帳號密碼先做**，社群登入之後 | 密碼重設與 email 驗證 MVP 先不做（Mailpit 已在 compose 裡待命，寄信碼還沒寫） |
| token | session cookie + cookieCache | 「短效 access + refresh」在 better-auth 的對應 |
| token 放哪 | **全部 httpOnly cookie** | app. / api. / board. 同 site，SameSite 擋得住；fetch 要 `credentials: "include"`，CORS 已指定 origin |
| 套件 | better-auth + Hono + Drizzle | 不選 Passport / Auth.js / IdP |
| DB | PostgreSQL，dev Docker、prod **Neon** 免費層 | prod 換 `drizzle-orm/neon-http`，只動 `packages/db/src/index.ts` |
| 寄信 | 不自架，用寄信 API（Resend / Postmark 類） | 要準備 SPF / DKIM / DMARC、API key、`sendResetPassword` hook |

⚠️ 靜態匯出**沒有 middleware**，`/home` 的保護只能在 client 擋，安全在 API 的 401。使用者知道且接受。

## 對話室那邊同一天定的（見 [[talk-room-state]]）

- LiveKit 用 **LiveKit Cloud Build**（免費、不用信用卡）；token 由房間服務簽、短命。⚠️ 用量上限沒印在方案卡上，開專案時去看
- 白板 **tldraw**（`@tldraw/sync` 自架）；chat / 反應 / 計時 / 進出房走**自有 WS**；白板與 chat 只在房間開著時持久化
- dev 與 prod 分開：`NEXT_PUBLIC_*` 指不同端點、兩個 database、JWT secret 不同

## Cloudflare 存取（2026-09-21 查過）

wrangler 4.86 OAuth 已登入（`water6240@gmail.com`）；cloudflared 有憑證與三條既有 tunnel。缺 R2 scope、Zone 只有 read。
規矩：讀取直接查，**任何寫入（deploy / tunnel / DNS / D1）先跟使用者確認那一條指令**。

## 最高約束：零預算、只看技術

「這是協作的專案，我採取的是不花任何錢，只看其中用的技術。」免費層天花板就是天花板。
⚠️ tldraw 免費版帶浮水印，不接受就換 Excalidraw。

## prod 走 B：全託管、零機器

前端 Cloudflare Pages；Hono API + 自有 WS 在 Workers + Durable Objects；tldraw sync 用官方 DO 範本；Postgres 在 Neon；LiveKit Cloud。
⚠️ Cloudflare 跑不了 Postgres 與 LiveKit，B 成立靠 Neon 與 LiveKit Cloud。

## 未定 / 下一步

- ~~前端接 API~~ **已接（2026-09-21）**，見 [[auth-pages-state]]。還沒做的：`/home` 在 client 查 session
  （`GET /api/auth/get-session`）沒登入就導去 login；登出按鈕（`POST /api/auth/sign-out`，body 要 `{}`）
- DB schema（除了 users）另開一場：個人資料欄位、房間預約、Word Bank、點數 ledger
- vault 的 `tech-inventory` 要改 —— **使用者說一聲才動**

**How to apply:** 改 schema 一律 `db:generate` 產 migration 再 `db:migrate`，不手改 DB；secret 只放 `.env.local` / Workers secret。
