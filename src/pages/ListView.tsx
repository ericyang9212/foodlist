import { useState, useMemo } from 'react';
import { Search, X, Sparkles } from 'lucide-react';
import { FoodCard } from '../components/FoodCard';
import { TonightModal } from '../components/TonightModal';
import { STATUS_LABELS } from '../types';
import type { FoodItem, Status } from '../types';

interface Props {
  items: FoodItem[];
  onOpen: (item: FoodItem) => void;
}

const ALL_STATUSES: Status[] = ['want', 'tried', 'skip'];

export function ListView({ items, onOpen }: Props) {
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<Status | null>('want');
  const [showTonight, setShowTonight] = useState(false);

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (activeStatus && item.status !== activeStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.restaurants.some(r => r.name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [items, activeStatus, search]);

  const counts = useMemo(() => {
    const c: Partial<Record<Status, number>> = {};
    items.forEach(i => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [items]);

  const wantItems = useMemo(() => items.filter(i => i.status === 'want'), [items]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-6 pt-14 pb-5">
        <div className="text-[10px] tracking-[0.5em] text-[#c9a961]/70 mb-2">PERSONAL ARCHIVE</div>
        <h1 className="text-[28px] font-medium text-gold-gradient tracking-[0.15em]">待 吃 清 單</h1>
        <div className="mt-3 h-[1px] bg-gradient-to-r from-[#c9a961]/40 via-[#c9a961]/10 to-transparent" />
      </div>

      {/* 今晚吃什麼 — 核心功能 */}
      {wantItems.length > 0 && (
        <div className="px-6 mb-5">
          <button
            onClick={() => setShowTonight(true)}
            className="group w-full relative bg-gradient-to-br from-[#1a1612] to-[#0f0d0a] border border-[#c9a961]/40 hover:border-[#c9a961] transition-colors py-5 px-5 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c9a961]/5 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="relative flex items-center justify-between">
              <div className="text-left">
                <div className="text-[10px] tracking-[0.5em] text-[#c9a961]/80 mb-1">TONIGHT</div>
                <div className="text-[17px] text-[#f5f1e8] tracking-[0.15em] font-medium">今晚吃什麼？</div>
                <div className="text-[11px] text-[#8a8478] tracking-wider mt-0.5">
                  從 {wantItems.length} 個想吃的隨機抽
                </div>
              </div>
              <Sparkles size={24} className="text-[#c9a961]" />
            </div>
          </button>
        </div>
      )}

      {/* Search */}
      <div className="px-6 mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
          <input
            type="text"
            placeholder="搜尋"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-[#161616] border border-[#2a2a2a] focus:border-[#c9a961]/40 text-[13px] text-[#f5f1e8] placeholder-[#555] tracking-wider focus:outline-none transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={12} className="text-[#666]" />
            </button>
          )}
        </div>
      </div>

      {/* 狀態 tabs */}
      <div className="px-6 mb-5">
        <div className="flex gap-1.5">
          <button
            onClick={() => setActiveStatus(null)}
            className={`text-[11px] tracking-[0.2em] px-3 py-1.5 border transition-colors ${
              activeStatus === null
                ? 'bg-[#c9a961] text-[#0a0a0a] border-[#c9a961]'
                : 'border-[#2a2a2a] text-[#8a8478]'
            }`}
          >
            全部 · {items.length}
          </button>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setActiveStatus(activeStatus === s ? null : s)}
              className={`text-[11px] tracking-[0.2em] px-3 py-1.5 border transition-colors ${
                activeStatus === s
                  ? 'bg-[#c9a961] text-[#0a0a0a] border-[#c9a961]'
                  : 'border-[#2a2a2a] text-[#8a8478]'
              }`}
            >
              {STATUS_LABELS[s]} · {counts[s] ?? 0}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 pb-28">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-3">— —</div>
            <p className="text-[#666] text-[13px] tracking-wider">
              {items.length === 0 ? '點下方 + 新增想吃的食物' : '無符合的食物'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(item => (
              <FoodCard key={item.id} item={item} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>

      {/* 今晚吃什麼 modal */}
      {showTonight && (
        <TonightModal
          candidates={wantItems}
          onOpen={onOpen}
          onClose={() => setShowTonight(false)}
        />
      )}
    </div>
  );
}
