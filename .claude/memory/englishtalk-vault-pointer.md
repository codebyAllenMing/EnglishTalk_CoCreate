---
name: englishtalk-vault-pointer
description: EnglishTalk 的規格與決策放在 Obsidian vault，不在 repo 內；入口與讀取方式
metadata:
  type: project
---

產品規格、決策與未解問題都在 Obsidian vault，**不要在 repo 內另建一份**（雙寫必然不同步）：

```
~/Documents/知識庫/EnglishTalk_CoCreate/
```

入口是 MOC：`EnglishTalk.md` — 先讀它（約 250 token）判斷該讀哪則，不要整包讀。

筆記慣例（frontmatter）：
- `type`: `moc` `decision` `spec` `design` `question`
- `status`: `draft` `confirmed` `stub` `open` `superseded`
- **`status: superseded` 的筆記不可當有效資訊使用**（如 `language-exchange-ux-flow.md`）

分工：vault 放思考產物（規格/決策/脈絡），本目錄放實作紀錄與專案慣例。

**How to apply:** 需要產品規則時去 vault 讀；寫實作決策時寫這裡。Allen 在本專案同時是 PM 與開發者，`type: spec` 是兩種視角共用的單一真相來源。
