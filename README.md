# EnglishTalk — 雙語學習空間

🌍 一個兩個人可以同時用視訊、聊天、白板一起學英文的空間。

**Phoeph & Allen 共創專案**

---

## 快速開始

### 發表講義

- **[查看完整講義](https://htmlpreview.github.io/?https://github.com/AllenBo/EnglishTalk_CoCreate/blob/main/docs/presentation.html)** — HTML 互動版
- **[Markdown 版](docs/presentation.md)** — 純文字版

---

## 概念

### 痛點
傳統的語言交換很碎片：一邊打字一邊講話，遇到不會的詞沒地方記，聊到好玩的話題也沒人幫你整理。

### 解決方案
把這些都放在一起——講話時邊上白板畫，講到的詞直接按一下就存起來，下次複習一打開就看得到。

---

## 功能

- **實時視訊 + 聲音** — 面對面對話，Cloudflare Realtime SFU 直連媒體
- **共同白板** — tldraw 同步繪圖，一起記筆記
- **即時聊天** — 文字交流，聊天記錄自動保存
- **計時器** — 掌握學習時間，Server 時間錨點 + 客戶端時差推算
- **單字庫** — 對話中遇到的詞彙自動存檔，下次複習一打開就看得到
- **日程管理** — 週曆或總覽檢視接下來的房間，隨時掌握學習進度
- **通知系統** — 房間邀請、開始提醒、成員變動全都知道

---

## 技術棧

**前端**  
- Next.js 15（React 19）
- Tailwind CSS、vue-i18n 多語系
- tldraw 白板 5.4+（需授權金鑰）
- Cloudflare Realtime Serverless SFU 視訊

**後端**  
- Hono（輕量 HTTP 框架）
- better-auth（認證）
- Drizzle ORM + PostgreSQL
- WebSocket（聊天 + 計時器 + 狀態通知）

**部署**  
- Next.js 正式 build 在 Mac mini M4
- pm2 常駐進程管理
- Docker Compose（Postgres）
- Cloudflare Tunnel（外網對外）

---

## 開發環境

### 前置
- Node.js 24（nvm）
- Docker Desktop
- pnpm 11.22+

### 本機啟動
```bash
# 安裝依賴
corepack pnpm install

# 啟動 DB
docker compose up -d

# 執行 migration
corepack pnpm db:migrate

# 測試資料（11 個帳號）
corepack pnpm db:seed

# 啟動前後端（dev mode, https）
pnpm dev       # 前端 6531
pnpm dev:api   # API 4000
```

帳號：任何 seed 帳號 + 密碼 `1qaz@WSX`

---

## 上線環境

**正式網址**  
https://talk.allenmingstudio.com

**更新流程**（Mac mini 上）
```bash
cd ~/Documents/GIT/EnglishTalk_CoCreate
git pull
corepack pnpm install
corepack pnpm db:migrate
corepack pnpm build
pm2 restart all
```

---

## 發表檢查清單（2026-09-23）

- [ ] `pm2 status` 確認三個服務 online
- [ ] `curl https://talk.allenmingstudio.com/health` 回 `{"ok":true}`
- [ ] 示範前一小時執行 `corepack pnpm db:seed`
- [ ] 示範前重啟 API：`pm2 restart monstertalk-api`
- [ ] 會場 Wi-Fi 用手機測視訊；連不上改 4G 熱點
- [ ] 兩個示範帳號先登入、分頁開著
- [ ] tldraw 授權金鑰有效期確認（10/7 前需換 Hobby license）

---

## 記憶與文件

詳見 `.claude/memory/MEMORY.md` 跨對話記錄：
- 規格與決策文件
- 功能實作狀態
- 已知坑與解決方案
- 部署與運維紀錄

---

## License

MIT

---

**Last Updated**: 2026-09-23
