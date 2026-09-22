# EnglishTalk_CoCreate — 專案記憶索引

> 一行一則記憶：`- [標題](檔名.md) — 一句話勾子`
> 記憶內容寫在各自的 .md，不要寫進本檔。

- [規格在 Obsidian vault](englishtalk-vault-pointer.md) — 產品規格與決策不在 repo 內，入口是 vault 的 EnglishTalk.md
- [前端建置狀態](frontend-build-state.md) — 已完成什麼、關鍵技術決策、待辦清單
- [素材產製工具鏈](asset-pipeline.md) — Codia 出 SVG、ChatGPT 出 PNG，入庫前一律程式化調色
- [登入註冊頁狀態](auth-pages-state.md) — 三頁完成、已接 better-auth API（fetch 包裝、錯誤碼對應、Origin 坑）、RWD 踩坑，設計稿落差清單
- [個人首頁狀態](profile-page-state.md) — 設計稿數據、已定決策與 11 隻頭像素材，開工前的完整脈絡
- [對話室狀態](talk-room-state.md) — /room/[code] 的 mock、計時與 Word Bank 的定案；接後端定案：進房兩層守門（server 必擋）、tldraw 白板、pub/sub 隔離
- [後端第一步：登入與 DB](auth-backend-plan.md) — better-auth + Hono + Drizzle 已蓋好、前端已接、db:seed 有 11 個測試帳號；怎麼跑、踩過的坑、下一步
- [交測前給啟動指令](feedback-test-handoff.md) — 每次要使用者測試都附 dev:api / dev 兩條指令，Docker 常駐不用提
- [DB schema 定案](data-model-decisions.md) — 個人資訊進 Users、興趣 text[]、頭像 lookup 表、presence 住 cache 不進 DB；房間主單 / 子單結構已定未建、代幣延後
- [時間欄位命名 xxxDate](feedback-naming-timestamps.md) — createDate / updateDate / startDate / endDate，不用 xxxAt；better-auth 用 fields 對映、drizzle-kit 改名的做法
