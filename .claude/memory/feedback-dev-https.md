---
name: feedback-dev-https
description: 使用者的開發習慣是 dev 環境一開始就用 https，這專案 2026-09-22 補上
metadata:
  type: feedback
---

使用者 2026-09-22：「我一開始設定的時候忘記都先用 https，我以前開發習慣都會用 https」。所以 dev 一律 https，不做 http / https 兩種模式。

**Why:** 習慣使然，而且視訊的 getUserMedia 在 localhost 以外非 https 不可，手機測試一定會撞到；晚補要一次改 origin、cookie、WS 三處。

**How to apply:** 新專案一開始就把前端與 API 都架在 https（Next 用 `--experimental-https`，「next 本身有機制可以設定」是使用者指的東西），
API 共用同一份 mkcert 憑證。這專案的做法見 [[auth-backend-plan]] 與 `_dev/dev-accounts.md` 的 https 段。
