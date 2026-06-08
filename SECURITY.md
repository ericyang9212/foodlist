# 安全審查紀錄

> 日期：2026-06-08 ｜ 對象：PSJ dice list（待吃清單）
> 範圍：前端程式碼 + Supabase 後端（project ref `dfhblcoaicgxqbbbwiil`）

本次針對既有程式與後端設定做了一輪漏洞審查並修正。以下逐項記錄問題、修法與回滾方式。

---

## 1. 前端

### 1.1 Stored XSS：使用者連結未過濾 scheme 🔴
- **問題**：餐廳的 `googleMapsUrl` 與靈感的 `sourceUrl` 由使用者自由輸入，且資料在帳號間共用，卻直接綁到 `<a href>`。有人若存入 `javascript:...` 連結，另一位使用者點到就會在其 session 內執行 = stored XSS。
- **修法**：新增 `src/lib/url.ts` 的 `safeHttpUrl()`，只放行 `http:` / `https:`，其餘（`javascript:`、`data:` 等）一律擋掉並回傳 `undefined`。
- **套用處**：`src/pages/NearbyPage.tsx`、`src/components/RestaurantsEditor.tsx`、`src/pages/InboxPage.tsx`。

### 1.2 ID 可預測 / 易碰撞 🟡
- **問題**：`Math.random().toString(36).slice(2,10)`（約 41 bits）被當作資料庫主鍵與 storage 檔名，碰撞機率不可忽略、且可被猜測。原本在 4 個檔案各自重複實作。
- **修法**：新增 `src/lib/id.ts` 的 `makeId()`，優先用 `crypto.randomUUID()`，舊環境退回 `timestamp + random`。移除 `useInspirations.ts`、`useFoodprints.ts`、`RestaurantsEditor.tsx`、`AddEditPage.tsx` 內的重複實作。

### 1.3 `window.open` 缺 `noopener` 🟢
- **問題**：`NearbyPage.tsx` 開地圖的 `window.open(url, '_blank')` 未帶 `noopener`（雖為寫死網址，風險低）。
- **修法**：改為 `window.open(url, '_blank', 'noopener,noreferrer')`。

> 驗證：`npx tsc -p tsconfig.app.json --noEmit` 與 `npm run build` 皆通過。

---

## 2. 後端（Supabase）

### 2.1 storage：未登入即可刪檔 / 上傳 / 列舉 🔴
- **問題**：`inspirations` bucket 殘留給 `public`（含未登入）角色的政策：
  - `Public delete` → 任何人可刪除任意靈感圖片
  - `Public write` → 任何人可上傳檔案（storage / 流量濫用）
  - `Public read` / `Public read inspirations` / `Public read foodprints` → 任何人可 `list()` 列舉全部檔名
- **修法**：移除上述 5 條 `public` 政策。保留 `authenticated` 的 `Auth write/delete inspirations|foodprints`。
- **為何不影響功能**：App 顯示圖片用「public bucket 公開直連 URL」（與這些 RLS 政策無關）；上傳/刪除走 `authenticated` 政策；App 從未使用 `.list()`。

### 2.2 函式 search_path 可變 🟡
- **問題**：`public.set_updated_at()` 未固定 `search_path`，理論上有 search_path 注入風險。
- **修法**：`alter function public.set_updated_at() set search_path = '';`

> 以上以 migration `harden_storage_and_function_search_path` 套用。套用後 Supabase security advisor 對應的 storage 列舉與函式警告均消失。

### 2.3 外洩密碼保護（手動，後台設定）🟡
- **問題**：Auth 未開啟「Prevent use of leaked passwords」(HaveIBeenPwned)。
- **處理**：Dashboard → Authentication → Attack Protection →「Prevent use of leaked passwords」旁 **Configure in email provider** → 於 Email provider 開啟並 Save。
  - 直達：`https://supabase.com/dashboard/project/dfhblcoaicgxqbbbwiil/auth/protection`

---

## 3. 刻意保留（非漏洞）

- **RLS `USING(true)` for ALL（authenticated）** on `food_items` / `inspirations` / `foodprints` / `announcements` / `marquee`：
  這是「所有登入帳號共用同一份清單」的設計（情侶共用），資料表本就沒有 `user_id`。Supabase advisor 會持續報 `rls_policy_always_true`，**可忽略**。
  若未來要改成每人各自的資料，需新增 `user_id` 欄位並改寫所有查詢與政策——會破壞現有共用行為，目前不做。

---

## 4. 回滾 SQL

如需還原本次後端變更（**不建議**，會重新打開漏洞）：

```sql
-- 還原 storage 公開政策（會讓未登入者再次可讀列舉/上傳/刪除）
create policy "Public read"              on storage.objects for select to public using (bucket_id = 'inspirations');
create policy "Public read inspirations" on storage.objects for select to public using (bucket_id = 'inspirations');
create policy "Public read foodprints"   on storage.objects for select to public using (bucket_id = 'foodprints');
create policy "Public write"             on storage.objects for insert to public with check (bucket_id = 'inspirations');
create policy "Public delete"            on storage.objects for delete to public using (bucket_id = 'inspirations');

-- 還原函式 search_path 為可變
alter function public.set_updated_at() reset search_path;
```

前端變更請以 git 還原對應 commit 即可。
