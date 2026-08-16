# PSJ dice list — 維護守則

你正在維護一個**兩人共用的情侶待吃清單 PWA**（React 19 + TypeScript + Vite + Tailwind v4 + Supabase）。push 到 `main` 就會由 Vercel 自動部署到正式環境——**你的每個 push 都是直接上線**。

這份守則的每一條都對應一次真實發生過的失誤。讀到某條覺得「這太基本了，我不會犯」——那條就是你接下來會犯的。

## 行為守則

1. **宣告與行動必須一致。** 說「確認後執行」，手就不能動。若發現自己在核准前已經動了，回覆的**第一行**先承認，再解釋。
2. **被擋下的嘗試也是事件。** 權限被拒、指令逾時、驗證失敗——都要回報，不是當作沒發生。判準：如果使用者從別的管道發現這件事，會不會覺得你隱瞞了？會，就回報。
3. **範圍是借來的。** 被授權修 A 就只修 A。發現值得順手修的 B，**提出來等核准**，不要動手。「順便改一下比較好」正是該停下來的時刻。
4. **驗證＝實際執行，不是比對文字。** 本專案的最低驗證是三連：`npm run lint`、`npx tsc -p tsconfig.app.json --noEmit`、`npm run build`，全過才算。只做了靜態檢查就明說「這項只有靜態檢查」。
5. **App 有登入牆，你不能登入使用者的帳號。** 所以內頁 UI 無法實機驗證——這個限制**每次交付都要明講**，不要含糊帶過讓人以為看過畫面。
6. **失敗報告比成功報告有價值。** 不要把「部分完成」包裝成「完成」、把「沒測」說成「沒問題」。列出實際結果 vs 預期結果，標明根因是推測還是已驗證。
7. **卡住時唯一合法的出路是說出來。** 資訊不足、權限不足、指令矛盾——禁止用猜測填補後繼續、禁止繞路、禁止沉默放棄。
8. **權力越大動作越小。** 判準不是操作難不難，而是**失敗可不可逆**。刪資料、動 Supabase 正式庫、push——先讀後寫、寫前宣告。可逆且吵的操作（讀檔、grep、build）隨便做。
9. **對自己的認知也要驗證。** 說「設定是這個值」之前先 grep；說「上次是這樣做的」之前先看 git log。

## 每次改動的固定流程

1. **動手前先 `cd` 到專案目錄**（`C:\Users\ericy\Desktop\claude\foodlist`）——shell 的 cwd 會重置，曾多次因此打在錯的目錄。
2. **編輯前重新 Read 該檔案**。可能有平行對話同時在改這個 repo，憑記憶編輯曾直接撞掉別人的改動。
3. 改完跑驗證三連（守則 4）。
4. **把這次更新記進 `CHANGELOG.md`**（日期 + 做了什麼 + 為什麼）。這是專案的更新日誌慣例，不做等於沒交付。
5. **只有使用者說「推」才 commit/push**。commit 訊息用繁體中文，說明動機不只說明動作。

## 專案關鍵事實（違反這些會造出 bug）

- **資料層模式**：所有 store（`useStore` / `useFoodprints` / `useInspirations`）都是「樂觀更新 → 失敗回滾 + toast → 成功後用 server 回傳覆蓋」。新增任何寫入操作都必須沿用這個模式，並回傳成功與否給呼叫端。
- **寫入失敗時 UI 絕不自動關閉**。表單 / sheet 留在原地讓使用者重試，內容不能丟（AddEditPage、QuickLogSheet、LogFoodprintSheet 都是這樣）。曾因表單失敗仍關閉造成整篇筆記消失。
- **食物的照片不存在 food 上**，實際存在 `inspirations`，用 `convertedFoodId` 連到食物。動照片邏輯前先看 `App.tsx` 的 `syncFoodImage`。
- **店家型 vs 想吃型的判別是推導的，不是欄位**：`restaurants[0].name === item.name` ⇒ 店家型。這是為了讓舊資料免遷移自動歸類，不要新增欄位取代它。
- **多步驟寫入要有回滾鏈**：照片→食物→足跡，任一步失敗就把前面已建立的收回（見 `handleQuickLog`），不留半套資料。
- **兩人共用一份資料**，沒有 user_id 分隔——不要順手加上 per-user 過濾。
- Supabase 專案 ref：`dfhblcoaicgxqbbbwiil`。可用 Supabase MCP 的 `execute_sql` 先查正式資料再下判斷（曾兩次靠這個分清「資料沒存」還是「沒渲染」）。

## 設計系統（改 UI 前必讀）

2026-08-16 同一天改了兩次：先從「暖黑金 + 襯線字」換成明亮蘋果版面，再換成**暖調深色 + 玫瑰金**（現行）。版面骨架維持蘋果那套，只有色彩換掉。舊的香檳金寫法與中間那版的淺色寫法都已作廢，看到殘留就是漏改的。

- 語言：暖近黑畫布（`bg` `#131010`，刻意帶紅——純灰會讓玫瑰金顯髒）+ 微暖深色卡片（`surface`）+ 髮絲分隔線 + 系統字（SF Pro / 蘋方，退到 Noto Sans TC）。字距是**收緊**的（`letter-spacing: -0.01em`），不要再用 `tracking-[0.3em]` 那種拉開的排版。
- **單一深色主題**，不跟隨系統切淺色（`color-scheme: dark`）。要加淺色版就得整組重挑，不是把 token 反過來就好。
- **顏色只走 token，元件不要再寫死 hex**：token 都在 `src/index.css` 的 `@theme`，用 Tailwind 語意類別（`bg-bg` / `bg-surface` / `bg-fill` / `border-separator` / `text-text` / `text-muted` / `text-tint` …）。寫死 hex 會讓下次換色又得全站掃一遍（這次就掃了兩遍）。
- 色彩分工：互動一律玫瑰金 `tint`；三個段落各有點題色——足跡 `gold`（香檳金）、清單 `rose`（玫瑰金）、靈感匣 `mauve`（丁香紫，唯一的冷調對比）；評分 `amber`、刪除 `danger`。每個色都有 `-soft` 深色淡底版本可鋪區塊。放在這些亮色塊上的文字用 `text-on-accent`（深色），不要用白色。
- 深色特有的坑（都踩過）：分段控制項要「深軌道 + 亮滑塊」（`bg-surface` 軌道、`bg-fill-strong` 選中），照淺色版的寫法會反過來變暗；跑馬燈顯示色與台灣地圖色階都得跟著底色重挑，否則整條看不見；深銅色的 logo 壓在深底會糊，主畫面給它玫瑰金底板、全螢幕的加柔光暈。
- **用既有的類別，不要發明新的一次性樣式**：眉標 `.eyebrow` / `.eyebrow-tc`、分隔線 `.rule`、字級 `.t-display`~`.t-caption`、按鈕 `.btn-primary` / `.btn-secondary` / `.btn-neutral` / `.btn-danger` / `.chip`、卡片 `.card-surface`、毛玻璃列 `.blur-bar`。
- 動態：曲線用 `--ease-ios` / `--ease-out-quint`，進場用 `.animate-rise`（單塊）、`.stagger`（列表逐項）、`.animate-pop`（抽籤結果）、`.animate-slideup`（sheet）、`.animate-fadein`（全頁覆蓋層）。**不要做回彈過衝**（impeccable 會擋 bounce-easing）。
- **無障礙底線（已全站校正過，不要倒退）**：
  - 深色底下最暗可用的灰是 `muted`（`#a3948f`，在 `bg` 6.48:1、在 `fill` 5.30:1）。不要用更暗的灰做正文或 placeholder。
  - 所有點題色的深淺兩版都實測過 ≥ 4.5:1（含反白文字放在色塊上）。改色時請一併重算，不要憑感覺挑。
  - 禁止漸層字（`background-clip: text`）——強制對比模式下會整段消失。
  - 圖示鈕一律 `.icon-btn`（自帶 44×44 熱區）+ `aria-label`。
  - 新動畫不用另外處理 reduced-motion，`index.css` 有全域規則；但不要用 `transition: all`。
- 可跑 `npx impeccable detect src` 做設計反模式掃描（目前是 0 issues，保持）。
