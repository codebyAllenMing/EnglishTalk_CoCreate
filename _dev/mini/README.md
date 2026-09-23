# Mac mini 部署（發表用）

一台 Mac 跑正式 build 的 web + api + Docker Postgres，用已經建好的 Cloudflare Tunnel 對外：
`https://talk.allenmingstudio.com`。視訊媒體直連 Cloudflare Realtime SFU，不經過這台。
發表後再搬 Cloudflare Workers + DO + Neon（程式結構已留好，見 `.claude/memory/auth-backend-plan.md`）。

## 一、第一次架（約 30 分鐘）

**前置**：Mac mini 接有線網路、系統設定關睡眠（能源 → 「防止自動進入睡眠」）、Docker Desktop 裝好並設開機自啟。

```bash
# 1. 工具：Node 24（nvm）、corepack、cloudflared、pm2
nvm install 24 && nvm use 24
corepack enable
brew install cloudflared
npm i -g pm2

# 2. 抓程式
git clone <repo> ~/Documents/GIT/EnglishTalk_CoCreate
cd ~/Documents/GIT/EnglishTalk_CoCreate
corepack pnpm install

# 3. 環境變數（不進 git，自己填）
cp .env.example .env.local
```

`.env.local` 跟 dev 的差別（其餘照 .env.example）：

```
API_ORIGIN=https://talk.allenmingstudio.com
WEB_ORIGIN=https://talk.allenmingstudio.com
BETTER_AUTH_SECRET=<重產一把：openssl rand -base64 32，不要用 MacBook 那把>
CF_REALTIME_APP_ID=<同 MacBook>
CF_REALTIME_APP_SECRET=<同 MacBook>
# TLS_CERT / TLS_KEY 留空：origin 走 http，https 由 Cloudflare 邊緣負責
```

白板的 tldraw 金鑰放 **`apps/web/.env.local`**（build 時內嵌，跟上面那份不同檔）：

```
NEXT_PUBLIC_TLDRAW_LICENSE_KEY=<tldraw.dev 的 hobby license>
```

```bash
# 4. DB
docker compose up -d
corepack pnpm db:migrate
corepack pnpm db:seed          # 11 個測試帳號 + SEED 房（密碼 1qaz@WSX）

# 5. 正式 build 與常駐
corepack pnpm build
pm2 start _dev/mini/ecosystem.config.cjs
pm2 save && pm2 startup        # 照它印出的 sudo 指令再跑一次
curl -s http://localhost:4000/health && curl -s -o /dev/null -w '%{http_code}\n' http://localhost:6531/zh-TW

# 6. Tunnel 金鑰：MacBook 的 ~/.cloudflared/3fb86b89-348b-4604-9e69-1f3239f5c6af.json AirDrop 過來放同一個位置
mkdir -p ~/.cloudflared
sed -i '' "s|<HOME>|$HOME|" _dev/tunnel/config.mini.yml
cloudflared tunnel --config _dev/tunnel/config.mini.yml ingress validate
cloudflared tunnel --config _dev/tunnel/config.mini.yml run     # 先前景跑一次看 Registered tunnel connection
# 確定通了再常駐：
sudo cloudflared --config "$PWD/_dev/tunnel/config.mini.yml" service install
```

⚠️ 同一條 tunnel 可以同時有多台 connector，MacBook 那邊的 dev tunnel 要**停掉**，不然流量會被分到兩台。

## 二、驗收

- 手機開 `https://talk.allenmingstudio.com`，登入 `allen@example.com` / `1qaz@WSX`，home 看得到週曆。
- 兩個帳號進 `SEED09`（seed 那一刻起 60 分鐘），視訊互看、聊天、計時器同步。
- `pm2 logs monstertalk-api` 沒有 `ERROR`。
- Cloudflare 儀表板 Caching → Development Mode 要**關**（正式 build 的靜態檔有 hash，快取是好事）。

## 三、更新程式

```bash
cd ~/Documents/GIT/EnglishTalk_CoCreate
git pull
corepack pnpm install
corepack pnpm db:migrate        # 有新 migration 才需要，多跑無害
corepack pnpm build
pm2 restart all
```

## 四、發表當天檢查清單

1. `pm2 status` 兩個都 online；`curl -s https://talk.allenmingstudio.com/health` 回 `{"ok":true}`。
2. 示範前一小時 `corepack pnpm db:seed`（SEED09 從那一刻起算 60 分鐘），然後 `pm2 restart monstertalk-api`（hub 裡的房間狀態要重建）。
3. 會場 Wi-Fi 先用手機測一次視訊；連不上就是 UDP 被擋，改開手機 4G 熱點。
4. 兩個示範帳號先登入好、分頁開著。
5. 出事看 `pm2 logs monstertalk-api --lines 200`，前端的例外也在裡面（`client.*`）。
