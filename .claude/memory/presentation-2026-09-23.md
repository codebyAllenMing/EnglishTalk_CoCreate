---
name: presentation-2026-09-23
description: 2026-09-23 晚上發表的講法骨架與 demo 風險清單（線上站已就緒），使用者切到便宜模型討論講稿時接續用
metadata: 
  node_type: memory
  type: project
  originSessionId: 43c6ebd9-ddfb-46cf-9585-e56f92cebdd7
  modified: 2026-09-23T14:21:12.686Z
---

## 發表完成（2026-09-23 已執行）

### ✅ 完成

**講稿** — 5 分鐘版本，非技術觀眾（共創夥伴，Phoeph & Allen）
- 聽眾：共創的夥伴，基本上都是非技術人員
- 時間：5 分鐘
- 無法 live demo：專案需要兩人互動（視訊、語音、白板、聊天），一人無法示範
- 內容：開場 30 秒 → 痛點 + 解決 1 分鐘 → 故事 2.5 分鐘 → 邀請 1 分鐘

**講義** — 可愛風格 HTML，完整講稿 + 8 張截圖
- `docs/presentation.html` — HTML 版本（圖片改用絕對 URL）
- `docs/presentation.md` — Markdown 純文字版
- `docs/screenshots/` — 01-landing、02-login、03-signup、04-home-week、05-home-overview、06-room-overview、06-room-overview-board、07-profile-settings

**README**
- 新建 `README.md`，含專案說明、功能、技術棧、開發環境、上線流程、發表檢查清單
- 署名：Phoeph & Allen 共創專案
- GitHub 連結失效（raw.githubusercontent 只顯示源碼），改用本機投影

**演講房間**
- 代碼：YLSTV2
- 名稱：專題演講-1
- 時間：2026-09-23 20:00-21:00（台北時間）
- Host：water6240@gmail.com
- 已建立並修正時間（先建 20:30，再在 DB 改回 20:00）

### ⚠️ 已知限制

- GitHub raw.githubusercontent 無法渲染 HTML（只顯示源碼）
- 房間開始時間不能少於 30 分鐘後（應用層驗證）

### 發表流程

本機投影：
```bash
open ~/Documents/GIT/EnglishTalk_CoCreate/docs/presentation.html
```

演講房間：YLSTV2（https://talk.allenmingstudio.com/room/YLSTV2）

### 發表前檢查清單

- [ ] `curl https://talk.allenmingstudio.com/health` 回 `{"ok":true}`
- [ ] `pm2 status` 確認三服務 online
- [ ] 若有空閒時間，發表前一小時 `db:seed` + `pm2 restart monstertalk-api`
- [ ] tldraw 金鑰有效（10/7 前需更新）
- [ ] 會場 Wi-Fi 先用手機測視訊（連不上改 4G 熱點）
