import { useState, useMemo } from 'react';
import { List, Footprints, Plus } from 'lucide-react';
import { useStore } from './store/useStore';
import { useInspirations } from './store/useInspirations';
import { useAnnouncements } from './store/useAnnouncements';
import { useMarquee } from './store/useMarquee';
import { useFoodprints } from './store/useFoodprints';
import { useAuth } from './store/useAuth';
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

// 最外層：先過 auth，未登入只給登入畫面，登入後才掛載資料層
export default function App() {
  const auth = useAuth();
  if (!auth.ready) return <FullScreenLoader />;
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
  const [detail, setDetail] = useState<FoodItem | null>(null);
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

  const handleOpen = (item: FoodItem) => setDetail(item);

  const handleEdit = (item: FoodItem) => {
    setDetail(null);
    setEditing(item);
    setShowAdd(true);
  };

  // 新增 / 編輯食物儲存，可帶圖
  const handleSave = async (item: FoodItem, attachedImageUrl?: string) => {
    if (editing) {
      updateItem(item);
    } else {
      addItem(item);

      // 處理附上的圖片
      if (attachedImageUrl) {
        if (fromInspiration && fromInspiration.imageUrl === attachedImageUrl) {
          // 來自既有靈感 → 把 inspiration 標為已轉換
          await inspirations.updateInspiration({
            ...fromInspiration,
            convertedFoodId: item.id,
          });
        } else {
          // 現場上傳的圖 → 建一筆 inspiration 並標為已轉換
          await inspirations.addInspiration({
            imageUrl: attachedImageUrl,
            convertedFoodId: item.id,
          });
        }
      }
    }
    setEditing(undefined);
    setShowAdd(false);
    setFromInspiration(null);
  };

  const handleUpdateFromDetail = (updated: FoodItem) => {
    updateItem(updated);
    setDetail(updated);
  };

  // 刪除食物時順手釋放指向它的靈感（讓截圖回到未整理、可重新利用）
  const handleDeleteFood = (id: string) => {
    deleteItem(id);
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
            unreadAnnouncements={announcements.unreadCount}
            onOpen={handleOpen}
            onOpenInbox={() => setShowInbox(true)}
            onOpenAnnouncements={() => setShowAnnouncements(true)}
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
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0a0a0a] border-t border-[#1f1f1f] flex items-center justify-around px-4 pt-3 z-40"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <NavBtn icon={<List size={22} />} label="清單" active={tab === 'list'} onClick={() => setTab('list')} />

        <button onClick={handleAddNew} className="flex flex-col items-center px-4">
          <div className="w-16 h-16 bg-[#c9a961] rounded-full flex items-center justify-center shadow-[0_0_24px_rgba(201,169,97,0.4)] active:scale-95 transition-transform -mt-9 ring-1 ring-[#e6c87a]/30">
            <Plus size={30} className="text-[#0a0a0a]" strokeWidth={2.5} />
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
          onConvertToFood={handleConvertInspiration}
          onClose={() => setShowInbox(false)}
        />
      )}

      {detail && (
        <DetailPage
          item={detail}
          thumbnailUrl={imageByFoodId[detail.id]}
          onClose={() => setDetail(null)}
          onEdit={handleEdit}
          onDelete={id => { handleDeleteFood(id); setDetail(null); }}
          onUpdate={handleUpdateFromDetail}
          onLogFoodprint={(it) => setLoggingFood(it)}
        />
      )}

      {loggingFood && (
        <LogFoodprintSheet
          food={loggingFood}
          uploadPhoto={foodprints.uploadPhoto}
          onSave={async (p) => {
            await foodprints.addFoodprint(p);
            // 同步把食物狀態改成 tried
            if (loggingFood.status === 'want') {
              updateItem({
                ...loggingFood,
                status: 'tried',
                updatedAt: new Date().toISOString(),
              });
            } else {
              updateItem({
                ...loggingFood,
                updatedAt: new Date().toISOString(),
              });
            }
          }}
          onClose={() => setLoggingFood(null)}
        />
      )}

      {showAdd && (
        <AddEditPage
          item={editing}
          inspiration={fromInspiration ?? undefined}
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
        active ? 'text-[#c9a961]' : 'text-[#555]'
      }`}
    >
      {icon}
      <span className="text-[12px] tracking-[0.3em]">{label}</span>
    </button>
  );
}
