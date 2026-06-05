import { useState } from 'react';
import { List, Navigation, Plus, ImageIcon } from 'lucide-react';
import { useStore } from './store/useStore';
import { useInspirations } from './store/useInspirations';
import { ListView } from './pages/ListView';
import { NearbyPage } from './pages/NearbyPage';
import { InboxPage } from './pages/InboxPage';
import { AddEditPage } from './pages/AddEditPage';
import { DetailPage } from './pages/DetailPage';
import type { FoodItem, Inspiration, Tab } from './types';

export default function App() {
  const { items, loading, addItem, updateItem, deleteItem } = useStore();
  const inspirations = useInspirations();

  const [tab, setTab] = useState<Tab>('list');
  const [detail, setDetail] = useState<FoodItem | null>(null);
  const [editing, setEditing] = useState<FoodItem | undefined>(undefined);
  const [showAdd, setShowAdd] = useState(false);
  const [fromInspiration, setFromInspiration] = useState<Inspiration | null>(null);

  const handleOpen = (item: FoodItem) => setDetail(item);

  const handleEdit = (item: FoodItem) => {
    setDetail(null);
    setEditing(item);
    setShowAdd(true);
  };

  const handleSave = async (item: FoodItem) => {
    if (editing) {
      updateItem(item);
    } else {
      // 從靈感轉過來的，標記靈感為已轉換
      if (fromInspiration) {
        const linkedItem = {
          ...item,
          inspirationIds: [fromInspiration.id, ...(item.inspirationIds ?? [])],
        };
        addItem(linkedItem);
        await inspirations.updateInspiration({
          ...fromInspiration,
          convertedFoodId: linkedItem.id,
        });
      } else {
        addItem(item);
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

  const handleConvertInspiration = (insp: Inspiration) => {
    setFromInspiration(insp);
    setEditing(undefined);
    setShowAdd(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-svh bg-[#0a0a0a]">
      <div className="text-center">
        <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-3">— —</div>
        <p className="text-[#666] text-[12px] tracking-[0.3em]">LOADING</p>
      </div>
    </div>
  );

  // 取得目前頁面 FAB 該做什麼
  const fabIcon = tab === 'inbox' ? <ImageIcon size={28} className="text-[#0a0a0a]" strokeWidth={2.5} />
                                   : <Plus size={30} className="text-[#0a0a0a]" strokeWidth={2.5} />;
  const fabAction = () => {
    if (tab === 'inbox') {
      document.getElementById('inbox-upload-trigger')?.click();
    } else {
      setEditing(undefined);
      setFromInspiration(null);
      setShowAdd(true);
    }
  };

  return (
    <div className="relative flex flex-col h-svh overflow-hidden bg-[#0a0a0a]">
      <div className="flex-1 overflow-hidden relative">
        {tab === 'list' && <ListView items={items} onOpen={handleOpen} />}
        {tab === 'inbox' && (
          <InboxPage
            items={inspirations.items}
            loading={inspirations.loading}
            onUpload={async (file, note) => {
              const url = await inspirations.uploadImage(file);
              await inspirations.addInspiration({ imageUrl: url, note: note || undefined });
            }}
            onDelete={inspirations.deleteInspiration}
            onConvertToFood={handleConvertInspiration}
          />
        )}
        {tab === 'nearby' && <NearbyPage items={items} onOpen={handleOpen} />}
      </div>

      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0a0a0a] border-t border-[#1f1f1f] flex items-center justify-around px-2 pt-3 z-40"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <NavBtn icon={<List size={22} />} label="清單" active={tab === 'list'} onClick={() => setTab('list')} />
        <NavBtn icon={<ImageIcon size={22} />} label="靈感" active={tab === 'inbox'} onClick={() => setTab('inbox')}
                badge={inspirations.items.filter(i => !i.convertedFoodId).length} />

        <button onClick={fabAction} className="flex flex-col items-center px-2">
          <div className="w-16 h-16 bg-[#c9a961] rounded-full flex items-center justify-center shadow-[0_0_24px_rgba(201,169,97,0.4)] active:scale-95 transition-transform -mt-9 ring-1 ring-[#e6c87a]/30">
            {fabIcon}
          </div>
        </button>

        <NavBtn icon={<Navigation size={22} />} label="附近" active={tab === 'nearby'} onClick={() => setTab('nearby')} />
        <div className="w-[60px]" />
      </nav>

      {detail && (
        <DetailPage
          item={detail}
          onClose={() => setDetail(null)}
          onEdit={handleEdit}
          onDelete={id => { deleteItem(id); setDetail(null); }}
          onUpdate={handleUpdateFromDetail}
        />
      )}

      {showAdd && (
        <AddEditPage
          item={editing}
          inspiration={fromInspiration ?? undefined}
          onSave={handleSave}
          onClose={() => { setEditing(undefined); setShowAdd(false); setFromInspiration(null); }}
        />
      )}
    </div>
  );
}

function NavBtn({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 px-4 py-1 transition-colors ${
        active ? 'text-[#c9a961]' : 'text-[#555]'
      }`}
    >
      <div className="relative">
        {icon}
        {badge && badge > 0 && (
          <span className="absolute -top-1.5 -right-2 bg-[#c9a961] text-[#0a0a0a] text-[9px] font-bold tracking-normal rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      <span className="text-[12px] tracking-[0.3em]">{label}</span>
    </button>
  );
}
