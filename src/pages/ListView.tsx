import { useState, useMemo } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { FoodCard } from '../components/FoodCard';
import { EmptyMark } from '../components/EmptyMark';
import { PlacesView } from '../components/PlacesView';
import type { FoodItem } from '../types';

type FilterTab = 'want' | 'tried' | 'all';

interface Props {
  items: FoodItem[];
  imageByFoodId: Record<string, string>;
  lastEatenByFoodId: Record<string, string>;
  // 分頁與縣市由主畫面持有：抽籤 / 快速加店完成後要能把清單切到對的分頁
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  activeCity: string | null;
  onCityChange: (city: string | null) => void;
  // 搜尋列吸頂的位置（由主畫面算，才不會蓋到段落切換列）
  stickyTop: string;
  onOpen: (item: FoodItem) => void;
  onQuickAdd: () => void;
}

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'want', label: '想吃' },
  { value: 'tried', label: '嘗過' },
  { value: 'all', label: '全部' },
];

// 合併主畫面裡的「清單」段落：只負責清單本身，抬頭 / 抽籤入口都在 HomePage
export function ListView({
  items, imageByFoodId, lastEatenByFoodId,
  activeTab, onTabChange, activeCity, onCityChange,
  stickyTop, onOpen, onQuickAdd,
}: Props) {
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'food' | 'place'>('food');

  // 從資料中抓出實際存在的縣市（依數量排序）
  const cityCounts = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach(item => {
      const cities = new Set<string>();
      item.restaurants.forEach(r => { if (r.city) cities.add(r.city); });
      cities.forEach(c => m.set(c, (m.get(c) ?? 0) + 1));
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (!search && item.status === 'skip' && activeTab !== 'all') return false;
      if (!search && activeTab !== 'all' && item.status !== activeTab) return false;
      if (activeCity) {
        if (!item.restaurants.some(r => r.city === activeCity)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.restaurants.some(r => r.name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [items, activeTab, activeCity, search]);

  const counts = useMemo(() => {
    let want = 0, tried = 0;
    items.forEach(i => {
      if (i.status === 'want') want++;
      else if (i.status === 'tried') tried++;
    });
    return { want, tried, all: items.length };
  }, [items]);

  return (
    <div>
      {/* ── Sticky 篩選列：往下滑時固定在段落切換列下方，隨時可搜尋/切換 ── */}
      <div
        className="sticky z-20 bg-[#0b0a08]/95 backdrop-blur-md border-b border-[#211c15]"
        style={{ top: stickyTop }}
      >
        {/* Search */}
        <div className="px-6 pt-3 pb-2.5">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#837b6e]" />
            <input
              type="text"
              placeholder="搜尋"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-full text-base text-[#f5f1e8] placeholder-[#837b6e] tracking-wider focus:outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <X size={14} className="text-[#837b6e]" />
              </button>
            )}
          </div>
        </div>

        {/* 優雅下劃線 tabs + 食物/店家 視角切換 */}
        <div className="px-6">
          <div className="flex items-center justify-between border-b border-[#211c15]">
            <div className="flex items-center gap-8">
              {TABS.map(t => (
                <button
                  key={t.value}
                  onClick={() => onTabChange(t.value)}
                  className={`relative pb-3 pt-1 text-[15px] tracking-[0.3em] transition-colors ${
                    activeTab === t.value ? 'text-[#ead8aa]' : 'text-[#837b6e] hover:text-[#8a8478]'
                  }`}
                >
                  {t.label}
                  <span className="ml-1.5 text-[11px] tracking-normal opacity-60">
                    {counts[t.value]}
                  </span>
                  {activeTab === t.value && (
                    <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-[#c9a961] via-[#ead8aa] to-[#c9a961] shadow-[0_0_8px_rgba(201,169,97,0.5)]" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-full border border-[#2c261d] p-[3px] mb-1.5 text-[12px] tracking-[0.12em]">
              <button
                onClick={() => setViewMode('food')}
                className={`px-3.5 py-1.5 rounded-full transition-colors ${viewMode === 'food' ? 'bg-[#d6b974] text-[#100d07] font-medium' : 'text-[#8d877a]'}`}
              >
                食物
              </button>
              <button
                onClick={() => setViewMode('place')}
                className={`px-3.5 py-1.5 rounded-full transition-colors ${viewMode === 'place' ? 'bg-[#d6b974] text-[#100d07] font-medium' : 'text-[#8d877a]'}`}
              >
                店家
              </button>
            </div>
          </div>
        </div>

        {/* 縣市篩選（只在有資料時出現） */}
        {cityCounts.length > 0 && (
          <div className="overflow-x-auto px-6 py-2.5" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-2 w-max">
              <button
                onClick={() => onCityChange(null)}
                className={`flex-shrink-0 text-[12px] tracking-[0.2em] px-3.5 py-1.5 ${activeCity === null ? 'chip chip-active' : 'chip'}`}
              >
                全部
              </button>
              {cityCounts.map(([city, count]) => (
                <button
                  key={city}
                  onClick={() => onCityChange(activeCity === city ? null : city)}
                  className={`flex-shrink-0 text-[12px] tracking-[0.2em] px-3.5 py-1.5 ${activeCity === city ? 'chip chip-active' : 'chip'}`}
                >
                  {city} · {count}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="px-6 pt-4 pb-28">
        {/* 嘗過分頁：快速加吃過的店（直接進嘗過，餵給抽籤的「回訪」） */}
        {activeTab === 'tried' && !search && (
          <button
            onClick={onQuickAdd}
            className="w-full mb-3 border border-dashed border-[#c9a961]/30 text-[#c9a961]/80 hover:border-[#c9a961]/60 hover:text-[#ead8aa] rounded-[14px] py-3.5 flex items-center justify-center gap-2 text-[13px] tracking-[0.2em] transition-colors"
          >
            <Plus size={15} />
            快速加吃過的店
          </button>
        )}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <EmptyMark className="mb-4" />
            <p className="text-[#7d7566] text-[15px] tracking-wider">
              {items.length === 0 ? '點下方 + 新增想吃的食物' : '無符合的食物'}
            </p>
          </div>
        ) : viewMode === 'place' ? (
          <PlacesView foods={filtered} imageByFoodId={imageByFoodId} onOpen={onOpen} />
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(item => (
              <FoodCard
                key={item.id}
                item={item}
                thumbnailUrl={imageByFoodId[item.id]}
                lastEatenAt={lastEatenByFoodId[item.id]}
                onOpen={onOpen}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
