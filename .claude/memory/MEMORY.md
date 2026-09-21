# EnglishTalk_CoCreate — 專案記憶索引

> 一行一則記憶：`- [標題](檔名.md) — 一句話勾子`
> 記憶內容寫在各自的 .md，不要寫進本檔。

- [規格在 Obsidian vault](englishtalk-vault-pointer.md) — 產品規格與決策不在 repo 內，入口是 vault 的 EnglishTalk.md
- [前端建置狀態](frontend-build-state.md) — 已完成什麼、關鍵技術決策、待辦清單
- [素材產製工具鏈](asset-pipeline.md) — Codia 出 SVG、ChatGPT 出 PNG，入庫前一律程式化調色
- [登入註冊頁狀態](auth-pages-state.md) — 三頁完成、已接 better-auth API（fetch 包裝、錯誤碼對應、Origin 坑）、RWD 踩坑，設計稿落差清單
- [個人首頁狀態](profile-page-state.md) — 設計稿數據、已定決策與 11 隻頭像素材，開工前的完整脈絡
- [對話室狀態](talk-room-state.md) — /room/[code] 的 mock、計時與 Word Bank 的定案、接後端的邊界
- [後端第一步：登入與 DB](auth-backend-plan.md) — better-auth + Hono + Drizzle 骨架已蓋好、帳密登入 curl 跑通；怎麼跑、踩過的坑、前端還沒接
