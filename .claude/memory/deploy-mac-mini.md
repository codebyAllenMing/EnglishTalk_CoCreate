---
name: deploy-mac-mini
description: 發表用的部署定案（2026-09-23）：Mac mini 跑正式 build + Docker Postgres，Cloudflare Tunnel 對外；Workers 搬家延到發表後
metadata:
  type: project
---

使用者 2026-09-23 決定：發表前**不搬 Workers**（三個記憶體 hub 要改 DO、tldraw 換 DO 範本、Next 要 OpenNext，估兩三天且有空窗），
先在 **Mac mini** 跑正式 build（`next build` + `next start`、api 用 `start` 不用 watch）+ Docker Postgres，
用已建好的 tunnel `talk.allenmingstudio.com` 對外（origin 走 http，`_dev/tunnel/config.mini.yml`）。
使用者原話：「好吧也不是不行，明天早上我回去把 mac mini 弄起來再從 git 抓下來」。發表後第一件事再搬 Cloudflare。

步驟全在 `_dev/mini/README.md`（第一次架、驗收、更新、發表當天檢查清單）；pm2 設定在 `_dev/mini/ecosystem.config.cjs`
（log 在 `_dev/mini/logs/`，gitignore）。root 多了 `start:api` script。

**Why:** 這幾天就要發表，示範零風險優先；程式的 Workers 縫（`createApp` 不綁環境、hub 用 `SocketLike`、db 只換 driver）都還在。

**How to apply:** 在 mini 上任何動作照那份 README；tunnel 金鑰只能 AirDrop、不進 git；MacBook 的 dev tunnel 要停掉免得分流；
還沒決定的：TURN（會場 UDP 被擋時要）、DB 留本機 Docker 還是上 Neon。
