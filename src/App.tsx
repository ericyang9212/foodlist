import { useState } from 'react';
import { List, Navigation, Plus } from 'lucide-react';
import { useStore } from './store/useStore';
import { ListView } from './pages/ListView';
import { NearbyPage } from './pages/NearbyPage';
import { AddEditPage } from './pages/AddEditPage';
import { DetailPage } from './pages/DetailPage';
import type { FoodItem } from './types';

type Tab = 'list' | 'nearby';

export default function App() {
  const { items, loading, addItem, updateItem, deleteItem } = useStore();
  const [tab, setTab] = useState<Tab>('list');
  const [detail, setDetail] = useState<FoodItem | null>(null);
  const [editing, setEditing] = useState<FoodItem | undefined>(undefined);
  const [showAdd, setShowAdd] = useState(false);

  const handleOpen = (item: FoodItem) => setDetail(item);

  const handleEdit = (item: FoodItem) => {
    setDetail(null);
    setEditing(item);
    setShowAdd(true);
  };

  const handleSave = (item: FoodItem) => {
    editing ? updateItem(item) : addItem(item);
    setEditing(undefined);
    setShowAdd(false);
  };

  // detail 頁面更新資料（例如加店家）後，要同步刷新 detail 物件
  const handleUpdateFromDetail = (updated: FoodItem) => {
    updateItem(updated);
    setDetail(updated);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-svh bg-[#0a0a0a]">
      <div className="text-center">
        <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-3">— —</div>
        <p className="text-[#666] text-[11px] tracking-[0.3em]">LOADING</p>
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-col h-svh overflow-hidden bg-[#0a0a0a]">
      <div className="flex-1 overflow-hidden relative">
        {tab === 'list'
          ? <ListView items={items} onOpen={handleOpen} />
          : <NearbyPage items={items} onOpen={handleOpen} />
        }
      </div>

      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0a0a0a] border-t border-[#1f1f1f] flex items-center justify-around px-4 pt-3 z-40"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <NavBtn icon={<List size={20} />} label="清單" active={tab === 'list'} onClick={() => setTab('list')} />

        <button
          onClick={() => { setEditing(undefined); setShowAdd(true); }}
          className="flex flex-col items-center px-4"
        >
          <div className="w-14 h-14 bg-[#c9a961] rounded-full flex items-center justify-center shadow-[0_0_24px_rgba(201,169,97,0.35)] active:scale-95 transition-transform -mt-8 ring-1 ring-[#e6c87a]/30">
            <Plus size={26} className="text-[#0a0a0a]" strokeWidth={2.5} />
          </div>
        </button>

        <NavBtn icon={<Navigation size={20} />} label="附近" active={tab === 'nearby'} onClick={() => setTab('nearby')} />
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
          onSave={handleSave}
          onClose={() => { setEditing(undefined); setShowAdd(false); }}
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
      className={`flex flex-col items-center gap-1 px-6 py-1 transition-colors ${
        active ? 'text-[#c9a961]' : 'text-[#555]'
      }`}
    >
      {icon}
      <span className="text-[10px] tracking-[0.3em]">{label}</span>
    </button>
  );
}
