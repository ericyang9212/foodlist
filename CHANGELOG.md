# 更新紀錄

重要改動的摘要（完整歷史見 `git log`）。

## 2026-07-07

### 效能：程式碼分割（code splitting）
- 6 個非首屏元件改用 `React.lazy` 動態載入：`FoodprintsPage`、`AddEditPage`、`DetailPage`、`InboxPage`、`LogFoodprintSheet`、`AnnouncementsModal`，各使用點包 `<Suspense>`（足跡分頁 fallback 用 `FullScreenLoader`，彈窗類用 `null`）
- 主 JS 包從 531 kB 縮到 460 kB（gzip 151→131 kB），Vite 的 500 kB chunk 警告消失；最重的足跡頁（含台灣地圖 SVG，26 kB）改為點「足跡」分頁才下載
- PWA precache 自動涵蓋所有拆出的 chunk（24 entries），離線仍可開全部頁面
- 只動 `src/App.tsx` 的 import 方式，不碰業務邏輯（commit `a5b115f`）

### 修復 iOS Safari 自動縮放
- `index.html` viewport 加 `maximum-scale=1.0, user-scalable=no`，防止點輸入框或滑動時頁面突然放大
- 全站 18 個 input/textarea/select 字級統一改 `text-base`（16px）——iOS Safari 在 input 字級 < 16px 時會強制 zoom in
- `src/index.css` 加保底規則 `input, textarea, select { font-size: 16px; }`（commit `99d7920`）

### 其他
- 修正足跡樂觀新增插入順序，改依 `ate_at` 排序而非直接插最前面（commit `fc30fc1`）

## 2026-07-06

- 新增頁加「店家／想吃的東西」切換，解決打「壽司」被當成店的混淆
- 技術審視：修正錯誤處理缺口與 React 反模式
- 足跡時間軸新增月份折疊功能，最近 2 個月預設展開
- 足跡地圖改為台灣縣市 SVG 填色圖，取代 Leaflet（多次迭代：熱力圖 → 全屏抽屜 → 回歸正常捲動版面）
- 抽籤加「回訪」來源、快速加常去的店、縣市選擇提到最上面
- 跑馬燈改為永遠橫向滾動（無縫循環），字體換成 Noto Serif TC 斜體
