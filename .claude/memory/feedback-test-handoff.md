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


## 清測試資料只刪自己建的（2026-09-22 踩到）

curl 煙霧測試後我用 `delete from "Rooms" where code not like 'SEED%'` 清場，把使用者剛用畫面開的房（GLAF2D）一起刪了。
**以後只刪自己那次建的 code**（`where code in ('...')`），dev DB 也一樣 —— 使用者同時在用同一個 DB 測。
