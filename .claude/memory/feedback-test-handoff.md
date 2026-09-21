---
name: feedback-test-handoff
description: 交給使用者測試前，一律附上啟動 server 的指令；Docker 不用提，它一直開著
metadata:
  type: feedback
---

使用者 2026-09-21：「我測試前都給我語法去啟動 server，docker 就不用，因為我看他一直是啟動的。」

**Why:** 每次要他親自測（瀏覽器流程）時，他要的是可以直接貼的指令，不是「起 dev server」這種描述；
Docker Desktop 與 compose 的兩個容器在他機器上常駐，再提只是噪音。

**How to apply:** 交測的訊息最後放一個 code block，兩條指令分兩個終端：
```
corepack pnpm dev:api     # api 4000
corepack pnpm dev         # web 6531
```
不放 `docker compose up`。要用 `corepack pnpm`（他 shell 的 `pnpm` 被別名攔截）。
測試帳號見 [[auth-backend-plan]]。
