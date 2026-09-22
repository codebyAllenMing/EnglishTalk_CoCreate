---
name: feedback-log-exceptions
description: 使用者要求例外一定要寫 log 好追蹤，格式 [yyyy-mm-dd hh:mm:ss] 開頭；api 的 log.ts、前端丟到 /api/client-log
metadata:
  type: feedback
---

使用者 2026-09-22（視訊建好時）：「要幫我寫例外處理，如果發生例外寫 log，至少我們好追蹤」。

**Why:** 發表當天手機在別的網路上視訊接不上，沒有 log 就只能猜；.NET 背景習慣每個例外都有 trace。

**How to apply:**
- api：`src/log.ts` 的 `logError / logWarn / logInfo`，格式 **`[yyyy-mm-dd hh:mm:ss] ERROR scope — 訊息 | {JSON context}`**（使用者指定時間格式；本地時間），
  例外的 stack 縮排接下一行；`|` 後的 JSON 有 requestId / userId / code / sid，grep 一個欄位就能串起一次請求。
  `app.onError` 全域接未處理的例外（帶 requestId / method / path / userId，回 500 JSON 含 requestId），`hono/request-id` 每個請求一個 id，
  `process.on("unhandledRejection")` 留痕不掛、`uncaughtException` 留痕後 exit(1)。
- 上游呼叫（Cloudflare）：連不到是例外 → logError 後 502；回非 2xx 是預期失敗 → logWarn，body 原樣回前端。
- packages/live、whiteboard：hub / attach 有 `onError` 選項，api 接到 logError；訊息處理包 try/catch。
- 前端：`src/log.ts` 的 `reportError(scope, error, context)` → console 一份 + `POST /api/client-log`（登入者、欄位有上限）。
  useSfu 每一步（getUserMedia、session、push、ice、pull、close、negotiate）、useLive 放棄重連、白板 sync error 都走它。
  拒絕權限（NotAllowedError）是正常路徑不留痕。
- 新路由、新上游、新的 async 流程一律照這套；不要用裸的 console.error。
