---
name: feedback-naming-timestamps
description: 時間欄位一律 xxxDate（createDate / updateDate / startDate / endDate / expireDate），不用 xxxAt；DB、Drizzle、JSON I/O 都是；better-auth 用 fields 對映
metadata:
  type: feedback
---

時間欄位命名一律 **`xxxDate`**：`createDate`（寫入時間）、`updateDate`（修改時間）、`startDate` / `endDate`（起訖）、
`expireDate`、`lastSeenDate`。**不用 `xxxAt`**。DB 欄位、Drizzle 屬性、API 的 JSON 輸出三層同名。

**Why:** 使用者的全域 code-style 本來就寫 `createDate`，2026-09-22 我替四張 better-auth 的表照它預設的 `createdAt` 直接吃，
使用者發現後說「你已經自己命名了哦」。同一個 DB 兩種風格他不接受，趁資料還少一次全改（migration 0003，13 欄 RENAME）。

**How to apply:**
- 新表（Rooms、RoomMembers、Notifications…）直接用 `xxxDate`，別再帶 `xxxAt` 進來。
- better-auth 管的四張表：DB 欄位名走 `xxxDate`，`packages/auth/src/auth.ts` 用各 model 的 `fields` 把
  better-auth 的 `createdAt` 對到 `createDate`（key 是 better-auth 名、value 是 DB 名）。
  ⚠️ better-auth **自己的端點**（get-session、sign-in）回傳的 JSON 仍是它的 `createdAt / expiresAt`，改不了也不用改，
  前端只用 id / name / email / image。我們自己的路由（`/api/users` 等）輸出一律 `xxxDate`。
- drizzle-kit 對改名不友善：`generate` 會互動問「是改名還是刪了重建」，non-TTY 跑不了；
  `generate --custom` 產的 snapshot 是**複製上一版**，欄位還是舊名。做法是 `--custom` 拿 journal 項與空 SQL，
  手寫 RENAME COLUMN，再用 python 把新 snapshot 的 columns key / name 改掉，最後拿 drizzle 資料夾的副本
  跑 `generate --dialect=postgresql --schema=./src/schema/index.ts --out=<相對路徑>` 看到
  「No schema changes」才算對（`--out` 給絕對路徑會被加 `./` 前綴而讀不到）。
- 相關：[[data-model-decisions]]、[[auth-backend-plan]]
