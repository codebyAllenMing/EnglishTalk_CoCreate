---
name: auth-backend-plan
description: 後端第一步（登入 / token / DB 放哪 / dev 環境）在 2026-09-21 討論定案的內容，尚未動工
metadata: 
  node_type: memory
  type: project
  originSessionId: 43c6ebd9-ddfb-46cf-9585-e56f92cebdd7
  modified: 2026-09-21T12:01:02.868Z
---

**2026-09-21 討論定案，尚未動工。** 使用者說「討論就好」，等他說「開始」。
背景：四張設計稿的前端 mock 全部完成（見 [[frontend-build-state]]），後端與 DB 完全沒蓋。

## 為什麼從登入開始

token 是源頭：REST 的驗證、自有 WS 的握手、tldraw sync 的連線驗證、房間服務簽 LiveKit token
時「你是誰」的依據，全吃同一張。登入是最小的一塊，卻會把「server 放哪、DB 放哪」逼出來。

## 已定

| 項目 | 決定 | 理由 / 備註 |
|---|---|---|
| 登入方式 | **帳號密碼先做**，社群登入之後 | 使用者決定。密碼重設與 email 驗證 MVP 先不做，但知道是欠著的 |
| token | **短效 access + refresh** | 在 better-auth 裡是 session cookie + cookie cache，行為一樣 |
| token 放哪 | **全部 httpOnly cookie**（使用者從「瀏覽器帶 token」改過來） | app. / api. / board. 是同一個 site（eTLD+1），SameSite 擋得住、cookie 也送得到；fetch 要 `credentials: "include"` + CORS 指定 origin |
| 套件 | **better-auth + Hono + Drizzle** | 帳密一等公民、httpOnly cookie 預設、之後加 Google / LINE 是設定；Hono 同一份碼能跑 Node 與 Workers；Drizzle 是 vault F2 點名的 |
| 不選 | Passport（老設計）、Auth.js（為 Next server route 長的，跟靜態前端對不上）、IdP（要錢、多依賴） | |
| workspace | `apps/api`（Hono）+ `packages/auth`（better-auth 設定 + `requireUser` middleware + `verifySession()`）+ `packages/db`（Drizzle schema + migration） | 使用者要的「middleware 獨立套件」就是 `packages/auth`，房間服務 / tldraw 驗證都 import 它 |
| DB | **PostgreSQL**，prod 用 **Neon**（免費層） | 閒置會休眠、第一個請求冷啟動半秒到一秒，使用者接受。dev 仍是本機 Docker |
| dev 環境 | **Docker**：Postgres + Mailpit（假 SMTP，不寄真信） | 使用者：「dev 我也正有此意，用 docker」 |
| 寄信 | 不自架 mail server，用寄信 API（Resend / Postmark 類） | 要準備：寄件子網域的 SPF / DKIM / DMARC、一把 API key、better-auth 的 sendResetPassword hook |

⚠️ 靜態匯出**沒有 middleware**，`/home` 的保護只能在 client 擋（沒 session 就導去 login），
那是體驗不是安全；安全在 API 的 401。使用者知道且接受。

## 對話室那邊同一天定的（見 [[talk-room-state]]）

- LiveKit 用 **LiveKit Cloud**（Build 免費方案，不用信用卡；2026-09-21 改的，原本要自架是為了 domain，但端點使用者看不到、不需要掛 domain）；token 由房間服務簽、短命、每次進房一張。⚠️ Build 方案的用量上限（連線分鐘 / 頻寬）沒印在方案卡上，開專案時去看
- 白板 **tldraw**（`@tldraw/sync` 自架，要先測 storage adapter、連線驗 JWT、浮水印授權）
- chat / 反應 / 計時 / 進出房 / mic-cam 全走**自有 WS**，LiveKit 只管視訊
- 白板與 chat **只在房間開著時持久化**，結束就清；Word Bank 存單字時複製原句，所以不受影響
- dev 與 prod **一定分開**：前端靠 `NEXT_PUBLIC_*` 指不同端點、LiveKit 兩個專案（或兩組 key）、
  tldraw storage 分開、兩個 database（dev Docker / prod Neon）、JWT secret 不同

## Cloudflare 存取（2026-09-21 查過）

wrangler 4.86 OAuth 已登入（`water6240@gmail.com`）；cloudflared 有憑證與三條既有 tunnel。
缺 **R2 scope**、Zone 只有 read（tunnel 的 CNAME 走 `cloudflared tunnel route dns` 可以建）。
規矩：讀取直接查，**任何寫入（deploy / tunnel / DNS / D1）先跟使用者確認那一條指令**。

## dev 在 MacBook、全 localhost（2026-09-21 定）

前端 6531、api 4000、Postgres 5432、Mailpit 8025，**不需要 tunnel**（cookie 在 localhost 不分 port）。
Mac mini 那條先不用。

## 最高約束：零預算、只看技術（使用者 2026-09-21）

「這是協作的專案，我採取的是不花任何錢，只看其中用的技術。」
→ 免費層的天花板就是天花板，撞到了不是升級、是換免費的或砍功能。付費方案一律不在選項裡。
⚠️ tldraw 免費版帶「Made with tldraw」浮水印，零預算就是留著；不接受的話換 MIT 的 Excalidraw。

## prod 走 B：全託管、零機器（使用者 2026-09-21 看過 LiveKit 定價後定案）

| 東西 | 放哪 |
|---|---|
| 前端 | Cloudflare Pages |
| Hono API + 自有 WS | Cloudflare Workers + Durable Objects（DO 已開放免費方案） |
| tldraw sync | 官方的 Durable Objects 範本 |
| Postgres | Neon 免費層（Hono 從 Workers 用 HTTP driver 或 Hyperdrive 連） |
| LiveKit | LiveKit Cloud Build（$0/mo，無需信用卡） |

**Mac mini 那條不用了**（原本 A 路線：全在一台機器）。翻掉的三個決定：LiveKit 自架 → Cloud、
Postgres 在機器 → Neon、prod 一定有一台機器 → 不用。理由：使用者說的「上線上到 Cloudflare」
在 B 是真的；家用 Mac mini 的穩定度看家裡的電與網路、沒人 24 小時盯；Hono + Drizzle 走不下去
再搬回 A 不用重寫。要接受的：Neon 冷啟動、各家免費額度的天花板（LiveKit Ship 是 $50/mo 起）。

⚠️ Cloudflare 上跑不了 Postgres 與 LiveKit —— B 之所以成立，是把這兩個交給 Neon 與 LiveKit Cloud。

## 未定

- DB schema（除了 users）另開一場：使用者、房間預約、Word Bank、點數 ledger
- vault 的 `tech-inventory` 要改：A 區 LiveKit Cloud → 自架、C2 定 tldraw、C1/C3 併「自有 WS」、加持久化範圍 —— **使用者說一聲才動**

**How to apply:** 使用者說「開始」時，第一步是 `apps/api` + `packages/auth` + `packages/db` 的骨架
與 `docker-compose.yml`（Postgres + Mailpit），不要先碰前端。
