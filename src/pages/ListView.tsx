import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { FoodCard } from '../components/FoodCard';
import { STATUS_LABELS, CUISINE_TYPES } from '../types';
import type { FoodItem, Status } from '../types';

interface Props {
  items: FoodItem[];
  onOpen: (item: FoodItem) => void;
  onStatusChange: (id: string, status: Status) => void;
}

const ALL_STATUSES: Status[] = ['want', 'visited', 'revisit', 'avoid', 'unsure'];

export function ListView({ items, onOpen, onStatusChange }: Props) {
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState<Status | null>(null);
  const [activeCuisine, setActiveCuisine] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (activeStatus && item.status !== activeStatus) return false;
      if (activeCuisine && item.cuisineType !== activeCuisine) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.restaurants.some(r => r.name.toLowerCase().includes(q)) ||
          item.cuisineType?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, activeStatus, activeCuisine, search]);

  const counts = useMemo(() => {
    const c: Partial<Record<Status, number>> = {};
    items.forEach(i => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [items]);

  const hasFilters = activeStatus !== null || activeCuisine !== null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-14 pb-3 bg-[#f8f7f5]">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">待吃清單</h1>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋品項、店家..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveStatus(null)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              activeStatus === null ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            全部 {items.length}
          </button>
          {ALL_STATUSES.map(s => (
            counts[s] ? (
              <button
                key={s}
                onClick={() => setActiveStatus(activeStatus === s ? null : s)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                  activeStatus === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {STATUS_LABELS[s]} {counts[s]}
              </button>
            ) : null
          ))}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex-shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
              hasFilters ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            <SlidersHorizontal size={12} />
            篩選
          </button>
        </div>

        {/* Cuisine filter */}
        {showFilters && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {CUISINE_TYPES.map(c => (
              <button
                key={c}
                onClick={() => setActiveCuisine(activeCuisine === c ? null : c)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors border ${
                  activeCuisine === c
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">🍜</div>
            <p className="text-gray-500 text-sm">
              {search || hasFilters ? '沒有符合的品項' : '還沒有任何紀錄，點右下角新增吧！'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-1">
            {filtered.map(item => (
              <FoodCard
                key={item.id}
                item={item}
                onOpen={onOpen}
                onStatusChange={onStatusChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
