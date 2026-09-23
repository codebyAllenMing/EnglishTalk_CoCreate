---
name: tldraw-license
description: 線上白板一片空白的原因（2026-09-23）：tldraw 5 在非 localhost 網域沒帶 license key 會在 5 秒後把編輯器收掉；免費金鑰（hobby / 100 天 trial）與接法
metadata:
  type: project
---

**2026-09-23 線上（talk.allenmingstudio.com）白板「出現一下就消失、一片空白」**：不是 WS、不是 tunnel、不是 CSS，
是 tldraw 5.4 的授權機制。`@tldraw/editor` 的 `LicenseManager.getIsDevelopment()`：
`protocol === "http:"` 或 `https + loopback host`（localhost / 127.x / ::1 / *.localhost）或 `NODE_ENV !== "production"` 才算 dev；
其餘一律 production，沒金鑰 → state `unlicensed-production` → `LicenseProvider` **5 秒後 `setShowEditor(false)`**，
Console 印紅字「No tldraw license key provided! A license is required for production deployments.」
dev（https://localhost:6531）永遠看不到，只有正式網域會炸。server 端 log 完全正常（握手、connect 都通）。

**解法**：拿一把金鑰傳 `<Tldraw licenseKey>`（或 env `NEXT_PUBLIC_TLDRAW_LICENSE_KEY`，tldraw 自己會讀）。
免費來源（零預算可用）：tldraw.dev/pricing → **Hobby license 免費、非商業用**（`/get-a-license/hobby` 要申請）；
**100 天免費 trial 不用綁卡**（先拿這個撐發表）。金鑰綁網域，dev 不用。
金鑰不是 secret（會進瀏覽器 bundle），但照專案慣例放 env 不進 repo。

**替代**：Excalidraw（MIT、沒有金鑰機制）但沒有官方 sync，要自己寫廣播；Board.tsx 註解就是為這個留的縫。

**How to apply:** 換白板引擎或 tldraw 升版時先看 LicenseProvider 的 `shouldHideEditorAfterDelay`；正式站白板空白先查 Console 有沒有這段紅字。
