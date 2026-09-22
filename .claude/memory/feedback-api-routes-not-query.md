---
name: feedback-api-routes-not-query
description: API 的範圍（整本 vs 某房間）用 route 路徑區分，不用 query param 區分
metadata:
  type: feedback
---

使用者 2026-09-22 在定 Word Bank API 時明講：「不要用 params 去區分」「我習慣用 router」。
同一種資源在不同範圍下要拆成不同路徑，例如 `GET /api/me/words`（整本）與 `GET /api/rooms/:code/words`（某房），
不是 `GET /api/me/words?room=`。

**Why:** 使用者 .NET 出身，習慣 route 決定資源範圍、query 只做篩選 / 分頁；路徑分開也讓房間底下的路由自然過 `roomAccess` 守門。

**How to apply:** 開新 API 時，凡是「某父資源底下的子資源」一律掛在父資源路徑下（`/api/rooms/:code/xxx`），
「我的全部」掛 `/api/me/xxx`；query 只留 `from / to`、分頁這類篩選。見 [[data-model-decisions]]。
