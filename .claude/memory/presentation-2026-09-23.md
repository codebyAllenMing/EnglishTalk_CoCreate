---
name: presentation-2026-09-23
description: 2026-09-23 晚上發表的講法骨架與 demo 風險清單（線上站已就緒），使用者切到便宜模型討論講稿時接續用
metadata:
  type: project
---

**狀態**：2026-09-23 下午線上（talk.allenmingstudio.com，mini）功能全驗過：視訊、白板（tldraw 評估金鑰）、聊天 + 計時器（keepalive 已修）、通知、單字。

**講法骨架（15 分鐘版）**，使用者還沒回答：聽眾是誰、多長、能不能 live demo。
1. 一句話開場（不講技術）：兩個人約時間、一半中文一半英文，有視訊、白板、聊天，講到的字可以存。
2. Live demo 5 分：手機 allen + 電腦阿銘 → home「接下來的房間」進房 → 視訊互看 → 打字 → 點對方訊息存字 → 白板兩邊同步
   → ⇄ 看 5 秒緩衝與計時同步 → 回 home 鈴鐺看通知 → Find Monsters 打招呼對面亮。
3. 架構與選擇 5 分：限制先講（零預算、幾天、要上線）；一張圖 Next / Hono / Postgres / 一條 WS 分流 / tldraw sync /
   Cloudflare Realtime SFU 只轉媒體 / Tunnel 從家裡 mini 對外；三個決定：計時器 server 只送錨點、視訊代打路由藏 secret、通知只寫不刪讀時去重。
4. 今天踩的坑 2 分：tldraw 正式網域沒金鑰 5 秒自毀；Cloudflare 閒置 WS 100 秒逾時 → ping/pong；怎麼找到的（無頭 Chrome 帶 cookie 抓 WS 事件）。
5. 接下來 + 邀請：搬 Workers、評分代幣、找人一起做。

**Demo 風險清單**：發表前一小時 `db:seed` + `pm2 restart monstertalk-api`；mini 別重開機（沒 pm2 startup，重開要手動起三個，
別 `pm2 resurrect` 會起到 foodbot）；會場 Wi-Fi 先用手機測視訊，連不上開 4G 熱點；兩個帳號先登入好；tldraw 金鑰 10/7 到期。
