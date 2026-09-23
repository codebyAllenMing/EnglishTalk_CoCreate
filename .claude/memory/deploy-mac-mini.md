---
name: deploy-mac-mini
description: 發表用的部署（2026-09-23 已上線）：Mac mini M4 跑正式 build + Docker Postgres，Cloudflare Tunnel 走 pm2 對外；Workers 搬家延到發表後
metadata:
  type: project
---

**兩台機器**：開發是 Mac Air M2（使用者 `allen`，這裡）；正式是 **Mac mini M4**（使用者 `allenming`，家目錄 `/Users/allenming`，
repo 在 `~/Documents/GIT/EnglishTalk_CoCreate`，區網 IP 192.168.1.110，已開遠端登入，Mac Air 可 `scp` 過去）。

使用者 2026-09-23 決定：發表前**不搬 Workers**（三個記憶體 hub 要改 DO、tldraw 換 DO 範本、Next 要 OpenNext，估兩三天且有空窗），
先在 mini 跑正式 build（`next build` + `next start`、api 用 `tsx` 不 watch）+ Docker Postgres，
用 tunnel `talk.allenmingstudio.com`（id 3fb86b89…）對外，origin 走 http。**2026-09-23 中午已上線驗證通**（health、首頁、登入頁）。

## mini 上實際的樣子（跟 README 的出入）

- pm2 三個服務：`monstertalk-api`、`monstertalk-web`（來自 `_dev/mini/ecosystem.config.cjs`）、`monstertalk-tunnel`
  （手動 `pm2 start /opt/homebrew/bin/cloudflared --interpreter none -- tunnel --config ~/.cloudflared/monstertalk.yml run`，已 `pm2 save`）。
- tunnel 設定在 `~/.cloudflared/monstertalk.yml`（`config.mini.yml` 把 `<HOME>` 換掉後輸出，**不動 repo 的檔**）。
  沒用 `cloudflared service install`：macOS 的 launchd 模板不帶 `--config`，root daemon 只讀 `/etc/cloudflared/config.yml`；
  而且 mini 的 `~/.cloudflared/config.yml` 是使用者別的 tunnel（foodbot，舊的），不能蓋。
- corepack 在根目錄不知道 pnpm 版本（`packageManager` 只寫在 apps/web），mini 上用 `corepack prepare pnpm@11.22.0 --activate` 解。
- `.env.local`：API_ORIGIN / WEB_ORIGIN 都是 `https://talk.allenmingstudio.com`、TLS 留空、BETTER_AUTH_SECRET 另一把、CF_REALTIME 同 Mac Air。
- pm2 與 tunnel 都是**登入時**才起（LaunchAgent），mini 要自動登入；Docker Desktop 設登入自啟。
- **Mac Air 可免密碼 ssh 進 mini**：`ssh -i ~/.ssh/id_ed25519_mini allenming@192.168.1.110`（2026-09-23 建的專用金鑰，沒密語；
  使用者原本的 `id_ed25519_personal` 有密語打不了）。mini 的 shell 要 `export PATH=$HOME/.nvm/versions/node/v24.21.0/bin:$PATH` 才有 pm2。
  使用者忘了 mini 的密碼，所以 `pm2 startup` 那條 sudo 還沒做；`nvm alias default 24` 已設。
- 白板的 tldraw 金鑰在 mini 的 `apps/web/.env.local`（見 [[tldraw-license]]），換金鑰要重 build web。

## 已知待修（不擋發表）

- `next.config.ts` 的 `/_next/static` `no-store` 在正式 build 也送出（實測 chunk `cf-cache-status: BYPASS`，build 時 Next 有警告），
  註解說 Next 會蓋成 immutable 是錯的。要改成只在 dev 生效。
- README 第一節與 tunnel 那段要照上面對齊；ecosystem 可加第三個 app 讓 tunnel 也吃設定檔。

**Why:** 這幾天就要發表，示範零風險優先；程式的 Workers 縫（`createApp` 不綁環境、hub 用 `SocketLike`、db 只換 driver）都還在。

**How to apply:** mini 上的動作照 `_dev/mini/README.md`（更新程式：pull → install → migrate → build → `pm2 restart all`）；
發表前一小時重跑 `db:seed` 後要 `pm2 restart monstertalk-api`；出事 `pm2 logs monstertalk-api`。tunnel 金鑰不進 git。
還沒決定的：TURN（會場 UDP 被擋時要）、DB 留本機 Docker 還是上 Neon。
