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
        className="sticky z-20 blur-bar border-b border-separator"
        style={{ top: stickyTop }}
      >
        {/* Search：iOS 的圓角灰底搜尋框 */}
        <div className="px-6 pt-3 pb-2.5">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="搜尋"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-fill border border-transparent focus:border-tint focus:bg-surface rounded-[12px] text-base text-text placeholder-muted focus:outline-none transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn !p-1.5"
                aria-label="清除搜尋"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 想吃／嘗過／全部 + 食物／店家：兩組都走 iOS 分段控制項 */}
        <div className="px-6 pb-3 flex items-center gap-2">
          <div className="flex items-center bg-surface border border-separator rounded-[10px] p-[2px] flex-1">
            {TABS.map(t => (
              <button
                key={t.value}
                onClick={() => onTabChange(t.value)}
                aria-pressed={activeTab === t.value}
                className={`flex-1 px-2 py-1.5 rounded-[8px] t-caption font-medium transition-[background,color,transform] duration-200 ease-[var(--ease-ios)] active:scale-95 ${
                  activeTab === t.value
                    ? 'bg-fill-strong text-text'
                    : 'text-muted'
                }`}
              >
                {t.label}
                <span className="ml-1 text-[11px] tabular-nums opacity-70">{counts[t.value]}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center bg-surface border border-separator rounded-[10px] p-[2px] flex-shrink-0">
            {([['food', '食物'], ['place', '店家']] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={`px-3 py-1.5 rounded-[8px] t-caption font-medium transition-[background,color,transform] duration-200 ease-[var(--ease-ios)] active:scale-95 ${
                  viewMode === mode ? 'bg-fill-strong text-text' : 'text-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 縣市篩選（只在有資料時出現） */}
        {cityCounts.length > 0 && (
          <div className="overflow-x-auto px-6 py-2.5" style={{ scrollbarWidth: 'none' }}>
            <div className="flex gap-2 w-max">
              <button
                onClick={() => onCityChange(null)}
                className={`flex-shrink-0 text-[12px] px-3.5 py-1.5 ${activeCity === null ? 'chip chip-active' : 'chip'}`}
              >
                全部
              </button>
              {cityCounts.map(([city, count]) => (
                <button
                  key={city}
                  onClick={() => onCityChange(activeCity === city ? null : city)}
                  className={`flex-shrink-0 text-[12px] px-3.5 py-1.5 ${activeCity === city ? 'chip chip-active' : 'chip'}`}
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
            className="w-full mb-3 border border-dashed border-line text-tint hover:bg-tint-soft rounded-[18px] py-3.5 flex items-center justify-center gap-2 text-[13px] font-medium transition-colors"
          >
            <Plus size={15} />
            快速加吃過的店
          </button>
        )}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <EmptyMark className="mb-4" />
            <p className="t-body text-muted">
              {items.length === 0 ? '按右下角「新增」加想吃的食物' : '無符合的食物'}
            </p>
          </div>
        ) : viewMode === 'place' ? (
          <PlacesView foods={filtered} imageByFoodId={imageByFoodId} onOpen={onOpen} />
        ) : (
          <div className="flex flex-col gap-3 stagger">
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
