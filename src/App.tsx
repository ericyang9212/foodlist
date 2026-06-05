import { useState, useRef } from 'react';
import { List, Navigation, Plus } from 'lucide-react';
import { useStore } from './store/useStore';
import { useInspirations } from './store/useInspirations';
import { ListView } from './pages/ListView';
import { NearbyPage } from './pages/NearbyPage';
import { InboxPage } from './pages/InboxPage';
import { AddEditPage } from './pages/AddEditPage';
import { DetailPage } from './pages/DetailPage';
import { AddSheet } from './components/AddSheet';
import type { FoodItem, Inspiration, Tab } from './types';

export default function App() {
  const { items, loading, addItem, updateItem, deleteItem } = useStore();
  const inspirations = useInspirations();

  const [tab, setTab] = useState<Tab>('list');
  const [detail, setDetail] = useState<FoodItem | null>(null);
  const [editing, setEditing] = useState<FoodItem | undefined>(undefined);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [fromInspiration, setFromInspiration] = useState<Inspiration | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      if (fromInspiration) {
        addItem(item);
        await inspirations.updateInspiration({
          ...fromInspiration,
          convertedFoodId: item.id,
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
    setShowInbox(false);
  };

  // AddSheet 的兩個選項
  const handlePickText = () => {
    setEditing(undefined);
    setFromInspiration(null);
    setShowAdd(true);
  };

  const handlePickImage = () => {
    fileRef.current?.click();
  };

  const handleFileSelected = async (file: File) => {
    setShowInbox(true);
    try {
      const url = await inspirations.uploadImage(file);
      await inspirations.addInspiration({ imageUrl: url });
    } catch (e) {
      alert('上傳失敗，請再試一次');
      console.error(e);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-svh bg-[#0a0a0a]">
      <div className="text-center">
        <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-3">— —</div>
        <p className="text-[#666] text-[12px] tracking-[0.3em]">LOADING</p>
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-col h-svh overflow-hidden bg-[#0a0a0a]">
      <div className="flex-1 overflow-hidden relative">
        {tab === 'list' && (
          <ListView
            items={items}
            inspirations={inspirations.items}
            onOpen={handleOpen}
            onOpenInbox={() => setShowInbox(true)}
          />
        )}
        {tab === 'nearby' && <NearbyPage items={items} onOpen={handleOpen} />}
      </div>

      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0a0a0a] border-t border-[#1f1f1f] flex items-center justify-around px-4 pt-3 z-40"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <NavBtn icon={<List size={22} />} label="清單" active={tab === 'list'} onClick={() => setTab('list')} />

        <button
          onClick={() => setShowAddSheet(true)}
          className="flex flex-col items-center px-4"
        >
          <div className="w-16 h-16 bg-[#c9a961] rounded-full flex items-center justify-center shadow-[0_0_24px_rgba(201,169,97,0.4)] active:scale-95 transition-transform -mt-9 ring-1 ring-[#e6c87a]/30">
            <Plus size={30} className="text-[#0a0a0a]" strokeWidth={2.5} />
          </div>
        </button>

        <NavBtn icon={<Navigation size={22} />} label="附近" active={tab === 'nearby'} onClick={() => setTab('nearby')} />
      </nav>

      {/* hidden file input for image upload */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFileSelected(f);
          e.target.value = '';
        }}
      />

      {/* + 選單 */}
      {showAddSheet && (
        <AddSheet
          onPickText={handlePickText}
          onPickImage={handlePickImage}
          onClose={() => setShowAddSheet(false)}
        />
      )}

      {/* 靈感匣 modal */}
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
