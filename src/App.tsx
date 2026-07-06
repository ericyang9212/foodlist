import { useState, useMemo } from 'react';
import { List, Footprints, Plus } from 'lucide-react';
import { useStore } from './store/useStore';
import { useInspirations } from './store/useInspirations';
import { useAnnouncements } from './store/useAnnouncements';
import { useMarquee } from './store/useMarquee';
import { useFoodprints } from './store/useFoodprints';
import { useAuth } from './store/useAuth';
import { useAppConfig } from './store/useAppConfig';
import { MaintenanceScreen } from './pages/MaintenanceScreen';
import { AnnouncementsModal } from './components/AnnouncementsModal';
import { Marquee } from './components/Marquee';
import { LogFoodprintSheet } from './components/LogFoodprintSheet';
import { ListView } from './pages/ListView';
import { InboxPage } from './pages/InboxPage';
import { AddEditPage } from './pages/AddEditPage';
import { DetailPage } from './pages/DetailPage';
import { FoodprintsPage } from './pages/FoodprintsPage';
import { LoginScreen } from './pages/LoginScreen';
import type { FoodItem, Inspiration, Tab } from './types';

function FullScreenLoader() {
  return (
    <div className="flex items-center justify-center h-svh bg-[#0a0a0a]">
      <div className="text-center">
        <img
          src="/logo.png"
          alt="PSJ dice list"
          className="w-32 h-32 object-contain mx-auto mb-4 animate-pulse drop-shadow-[0_4px_20px_rgba(201,169,97,0.2)]"
        />
        <p className="text-[#666] text-[12px] tracking-[0.4em]">LOADING</p>
      </div>
    </div>
  );
}

// 在網址加 ?admin 可略過維護畫面（維護期間仍想自己進去用 / 預覽）
const BYPASS_MAINTENANCE = new URLSearchParams(window.location.search).has('admin');

// 最外層：先過維護旗標與 auth，未登入只給登入畫面，登入後才掛載資料層
export default function App() {
  const config = useAppConfig();
  const auth = useAuth();
  if (!config.ready || !auth.ready) return <FullScreenLoader />;
  if (config.maintenance && !BYPASS_MAINTENANCE) return <MaintenanceScreen message={config.message} />;
  if (!auth.session) return <LoginScreen onSignIn={auth.signIn} />;
  return <AppInner onSignOut={auth.signOut} />;
}

function AppInner({ onSignOut }: { onSignOut: () => void }) {
  const { items, loading, addItem, updateItem, deleteItem } = useStore();
  const inspirations = useInspirations();
  const announcements = useAnnouncements();
  const marquee = useMarquee();
  const foodprints = useFoodprints();

  const [tab, setTab] = useState<Tab>('list');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<FoodItem | undefined>(undefined);
  const [showAdd, setShowAdd] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [loggingFood, setLoggingFood] = useState<FoodItem | null>(null);
  const [fromInspiration, setFromInspiration] = useState<Inspiration | null>(null);

  // food id → 圖片 URL 的對照表（從靈感裡查）
  const imageByFoodId = useMemo(() => {
    const map: Record<string, string> = {};
    inspirations.items.forEach(insp => {
      if (insp.convertedFoodId && insp.imageUrl) {
        map[insp.convertedFoodId] = insp.imageUrl;
      }
    });
    return map;
  }, [inspirations.items]);

  // food id → food，給靈感相簿用（點截圖能跳到它變成的食物）
  const foodById = useMemo(() => {
    const map: Record<string, FoodItem> = {};
    items.forEach(f => { map[f.id] = f; });
    return map;
  }, [items]);

  // food id → 最後一次吃的時間（取自足跡，才是真正的「上次吃」，而非 updatedAt）
  const lastEatenByFoodId = useMemo(() => {
    const map: Record<string, string> = {};
    foodprints.items.forEach(p => {
      if (!map[p.foodId] || p.ateAt > map[p.foodId]) map[p.foodId] = p.ateAt;
    });
    return map;
  }, [foodprints.items]);

  // 詳情頁只存 id、內容從清單推導：對方 realtime 更新會自動反映，被刪掉就自動關閉
  const detail = detailId ? foodById[detailId] ?? null : null;

  const handleOpen = (item: FoodItem) => setDetailId(item.id);

  const handleEdit = (item: FoodItem) => {
    setDetailId(null);
    setEditing(item);
    setShowAdd(true);
  };

  // 同步食物的圖片（圖片實際存在 inspirations，用 convertedFoodId 連結）。
  // 一併處理：新增圖、換圖、移除圖。
  const syncFoodImage = async (foodId: string, newImageUrl?: string) => {
    const existing = inspirations.items.find(insp => insp.convertedFoodId === foodId);
    const currentUrl = existing?.imageUrl;
    if (newImageUrl === currentUrl) return; // 沒變更

    // 有舊圖且和新圖不同 → 先把舊靈感解除連結（回到未整理、可重用）
    if (existing) {
      await inspirations.updateInspiration({ ...existing, convertedFoodId: undefined });
    }

    if (!newImageUrl) return; // 只是移除圖片

    // 連結新圖：來自既有靈感就標記，否則建一筆新靈感
    if (fromInspiration && fromInspiration.imageUrl === newImageUrl) {
      await inspirations.updateInspiration({ ...fromInspiration, convertedFoodId: foodId });
    } else {
      await inspirations.addInspiration({ imageUrl: newImageUrl, convertedFoodId: foodId });
    }
  };

  // 新增 / 編輯食物儲存，可帶圖
  const handleSave = async (item: FoodItem, attachedImageUrl?: string) => {
    // 等食物實際寫入成功再處理圖片連結，避免食物回滾後靈感仍指向不存在的食物
    const ok = editing ? await updateItem(item) : await addItem(item);
    if (ok) await syncFoodImage(item.id, attachedImageUrl);
    setEditing(undefined);
    setShowAdd(false);
    setFromInspiration(null);
  };

  // updateItem 是樂觀更新，items 立即變 → 推導的 detail 自動跟上，不用手動同步
  const handleUpdateFromDetail = (updated: FoodItem) => {
    updateItem(updated);
  };

  // 刪除食物時順手釋放指向它的靈感（讓截圖回到未整理、可重新利用）
  // 等刪除確定成功才釋放，避免刪除失敗回滾後圖片卻已脫鉤
  const handleDeleteFood = async (id: string) => {
    const ok = await deleteItem(id);
    if (!ok) return;
    inspirations.items
      .filter(insp => insp.convertedFoodId === id)
      .forEach(insp => inspirations.updateInspiration({ ...insp, convertedFoodId: undefined }));
  };

  const handleConvertInspiration = (insp: Inspiration) => {
    setFromInspiration(insp);
    setEditing(undefined);
    setShowAdd(true);
    setShowInbox(false);
  };

  const handleAddNew = () => {
    setEditing(undefined);
    setFromInspiration(null);
    setShowAdd(true);
  };

  if (loading) return <FullScreenLoader />;

  return (
    <div className="relative flex flex-col h-svh overflow-hidden bg-[#0a0a0a]">
      <Marquee data={marquee.data} onUpdate={marquee.update} />
      <div className="flex-1 overflow-hidden relative">
        {tab === 'list' && (
          <ListView
            items={items}
            inspirations={inspirations.items}
            imageByFoodId={imageByFoodId}
            lastEatenByFoodId={lastEatenByFoodId}
            unreadAnnouncements={announcements.unreadCount}
            onOpen={handleOpen}
            onOpenInbox={() => setShowInbox(true)}
            onOpenAnnouncements={() => setShowAnnouncements(true)}
            onAddRegular={addItem}
          />
        )}
        {tab === 'foodprints' && (
          <FoodprintsPage
            items={foodprints.items}
            onDelete={foodprints.deleteFoodprint}
          />
        )}
      </div>

      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0a0a0a]/90 backdrop-blur-md flex items-center justify-around px-4 pt-3 z-40"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        {/* 頂緣金色細線，取代生硬的灰邊 */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#c9a961]/30 to-transparent" />
        <NavBtn icon={<List size={22} />} label="清單" active={tab === 'list'} onClick={() => setTab('list')} />

        <button onClick={handleAddNew} className="flex flex-col items-center px-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(201,169,97,0.45)] active:scale-95 transition-transform -mt-9 ring-1 ring-[#f0deae]/40" style={{ background: 'linear-gradient(150deg,#f0deae 0%,#d6b974 55%,#b1934f 100%)' }}>
            <Plus size={30} className="text-[#100d07]" strokeWidth={2.5} />
          </div>
        </button>

        <NavBtn icon={<Footprints size={22} />} label="足跡" active={tab === 'foodprints'} onClick={() => setTab('foodprints')} />
      </nav>

      {/* 公告 */}
      {showAnnouncements && (
        <AnnouncementsModal
          items={announcements.items}
          readIds={announcements.readIds}
          onMarkAllRead={announcements.markAllRead}
          onSignOut={onSignOut}
          onClose={() => setShowAnnouncements(false)}
        />
      )}

      {/* 靈感匣 */}
      {showInbox && (
        <InboxPage
          items={inspirations.items}
          loading={inspirations.loading}
          onUpload={async (file, note) => {
            const url = await inspirations.uploadImage(file);
            await inspirations.addInspiration({ imageUrl: url, note: note || undefined });
          }}
          onDelete={inspirations.deleteInspiration}
          onUpdate={inspirations.updateInspiration}
          onConvertToFood={handleConvertInspiration}
          foodById={foodById}
          onOpenFood={(id) => {
            if (foodById[id]) { setShowInbox(false); setDetailId(id); }
          }}
          onClose={() => setShowInbox(false)}
        />
      )}

      {detail && (
        <DetailPage
          item={detail}
          thumbnailUrl={imageByFoodId[detail.id]}
          onClose={() => setDetailId(null)}
          onEdit={handleEdit}
          onDelete={id => { handleDeleteFood(id); setDetailId(null); }}
          onUpdate={handleUpdateFromDetail}
          onLogFoodprint={(it) => setLoggingFood(it)}
        />
      )}

      {loggingFood && (
        <LogFoodprintSheet
          food={loggingFood}
          uploadPhoto={foodprints.uploadPhoto}
          onSave={async (p) => {
            // 足跡寫入失敗（store 已 toast 並回滾）就中止：狀態不動、sheet 留著讓使用者重試
            const inserted = await foodprints.addFoodprint(p);
            if (!inserted) throw new Error('foodprint insert failed');
            // 同步把食物狀態改成 tried；詳情頁內容是推導的，會自動跟上
            const updated: FoodItem = {
              ...loggingFood,
              status: loggingFood.status === 'want' ? 'tried' : loggingFood.status,
              updatedAt: new Date().toISOString(),
            };
            updateItem(updated);
          }}
          onClose={() => setLoggingFood(null)}
        />
      )}

      {showAdd && (
        <AddEditPage
          item={editing}
          inspiration={fromInspiration ?? undefined}
          initialImageUrl={editing ? imageByFoodId[editing.id] : undefined}
          onUploadImage={async (file) => {
            const url = await inspirations.uploadImage(file);
            return url;
          }}
          onSave={handleSave}
          onClose={() => { setEditing(undefined); setShowAdd(false); setFromInspiration(null); }}
        />
      )}
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 px-6 py-1 transition-colors ${
        active ? 'text-[#ead8aa]' : 'text-[#5d574c]'
      }`}
    >
      {icon}
      <span className="text-[12px] tracking-[0.3em]">{label}</span>
    </button>
  );
}
