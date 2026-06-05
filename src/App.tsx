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
  const { items, loading, addItem, updateItem, deleteItem, updateStatus } = useStore();
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

  if (loading) return (
    <div className="flex items-center justify-center h-svh bg-[#f8f7f5]">
      <div className="text-center">
        <div className="text-4xl mb-3">🍜</div>
        <p className="text-gray-400 text-sm">載入中...</p>
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-col h-svh overflow-hidden">
      <div className="flex-1 overflow-hidden relative">
        {tab === 'list'
          ? <ListView items={items} onOpen={handleOpen} onStatusChange={updateStatus} />
          : <NearbyPage items={items} onOpen={handleOpen} onStatusChange={updateStatus} />
        }
      </div>

      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 flex items-center justify-around px-2 pt-2 z-40"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        <NavBtn icon={<List size={22} />} label="清單" active={tab === 'list'} onClick={() => setTab('list')} />

        <button
          onClick={() => { setEditing(undefined); setShowAdd(true); }}
          className="flex flex-col items-center gap-0.5 px-4 py-1.5"
        >
          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-200 active:scale-95 transition-transform -mt-6">
            <Plus size={24} className="text-white" />
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5">新增</span>
        </button>

        <NavBtn icon={<Navigation size={22} />} label="附近" active={tab === 'nearby'} onClick={() => setTab('nearby')} />
      </nav>

      {detail && (
        <DetailPage
          item={detail}
          onClose={() => setDetail(null)}
          onEdit={handleEdit}
          onDelete={id => { deleteItem(id); setDetail(null); }}
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
      className={`flex flex-col items-center gap-0.5 px-6 py-1.5 transition-colors ${active ? 'text-orange-500' : 'text-gray-400'}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}
