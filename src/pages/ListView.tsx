import React, { useState, useMemo } from 'react';
import { Search, X, Sparkles, Bell, Images, Plus } from 'lucide-react';
import { FoodCard } from '../components/FoodCard';
import { PlacesView } from '../components/PlacesView';
import { TonightModal } from '../components/TonightModal';
import { QuickAddRegularSheet } from '../components/QuickAddRegularSheet';
import type { FoodItem, Inspiration } from '../types';

interface Props {
  items: FoodItem[];
  inspirations: Inspiration[];
  imageByFoodId: Record<string, string>;
  lastEatenByFoodId: Record<string, string>;
  unreadAnnouncements: number;
  onOpen: (item: FoodItem) => void;
  onOpenInbox: () => void;
  onOpenAnnouncements: () => void;
  onAddRegular: (item: FoodItem) => Promise<boolean>;
}

type FilterTab = 'want' | 'tried' | 'all';

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'want', label: '想吃' },
  { value: 'tried', label: '嘗過' },
  { value: 'all', label: '全部' },
];

const CITY_FILTER_KEY = 'foodlist_city_filter';

// sticky 篩選列吸頂位置：剛好停在跑馬燈下方
const STICKY_TOP = 'calc(env(safe-area-inset-top) + 56px)';

export function ListView({
  items, inspirations, imageByFoodId, lastEatenByFoodId,
  unreadAnnouncements,
  onOpen, onOpenInbox, onOpenAnnouncements, onAddRegular,
}: Props) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('want');
  const [activeCity, setActiveCity] = useState<string | null>(() => {
    try { return localStorage.getItem(CITY_FILTER_KEY); } catch { return null; }
  });
  const [showTonight, setShowTonight] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [viewMode, setViewMode] = useState<'food' | 'place'>('food');

  // 持久化縣市選擇
  React.useEffect(() => {
    if (activeCity) localStorage.setItem(CITY_FILTER_KEY, activeCity);
    else localStorage.removeItem(CITY_FILTER_KEY);
  }, [activeCity]);

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

  const wantItems = useMemo(() => items.filter(i => i.status === 'want'), [items]);
  // 回訪池：吃過的安心牌（不含標了「不好吃」的）
  const triedItems = useMemo(() => items.filter(i => i.status === 'tried'), [items]);
  const pendingInspirations = inspirations.filter(i => !i.convertedFoodId);

  return (
    // 整頁單一捲動容器：頂部資訊會隨內容往上滑走，把空間讓給清單
    <div className="h-full overflow-y-auto bg-[#0a0a0a]">
      {/* Header（隨頁面捲動） */}
      <div
        className="px-6 pb-5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 72px)' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 flex items-center gap-3">
            <img
              src="/logo.png"
              alt=""
              className="w-12 h-12 object-contain flex-shrink-0 drop-shadow-[0_2px_8px_rgba(201,169,97,0.2)]"
            />
            <div>
              <div className="text-[11px] tracking-[0.5em] text-[#c9a961]/70 mb-1.5">PSJ DICE LIST</div>
              <h1 className="text-[28px] font-medium text-gold-gradient tracking-[0.12em]">待 吃 清 單</h1>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={onOpenInbox}
              className="icon-btn relative"
              aria-label="靈感匣"
            >
              <Images size={20} className="text-[#c9a961]/80" />
              {pendingInspirations.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 text-[9px] text-[#c9a961] tracking-normal font-medium">
                  {pendingInspirations.length}
                </span>
              )}
            </button>
            <button
              onClick={onOpenAnnouncements}
              className="icon-btn relative -mr-2"
              aria-label="公告"
            >
              <Bell size={20} className="text-[#c9a961]/80" />
              {unreadAnnouncements > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[#c9a961] rounded-full" />
              )}
            </button>
          </div>
        </div>
        <div className="mt-4 h-[1px] bg-gradient-to-r from-[#c9a961]/40 via-[#c9a961]/10 to-transparent" />
      </div>

      {/* 今晚吃什麼（隨頁面捲動） */}
      {(wantItems.length > 0 || triedItems.length > 0) && (
        <div className="px-6 mb-4">
          <button
            onClick={() => setShowTonight(true)}
            className="group w-full relative bg-gradient-to-br from-[#221b10] to-[#100d09] border border-[#c9a961]/35 hover:border-[#c9a961]/70 hover:shadow-[0_6px_26px_rgba(201,169,97,0.2)] rounded-[16px] transition-all py-6 px-6 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c9a961]/8 rounded-full blur-2xl -mr-10 -mt-10" />
            <div className="relative flex items-center justify-between">
              <div className="text-left">
                <div className="text-[11px] tracking-[0.5em] text-[#c9a961]/80 mb-2.5">TONIGHT</div>
                <div className="text-[21px] text-[#f6efe0] tracking-[0.08em] font-medium" style={{ fontFamily: "'Noto Serif TC', serif" }}>今晚吃什麼？</div>
                <div className="text-[13px] text-[#8d877a] tracking-wider mt-2">
                  {wantItems.length > 0
                    ? `從 ${wantItems.length} 個想吃的抽${triedItems.length > 0 ? ' · 或回訪' : ''}`
                    : `從 ${triedItems.length} 間回訪的抽`}
                </div>
              </div>
              <div className="w-[52px] h-[52px] rounded-full border border-[#c9a961]/45 flex items-center justify-center flex-shrink-0">
                <Sparkles size={24} className="text-[#ead8aa]" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* ── Sticky 篩選列：往下滑時固定在跑馬燈下方，隨時可搜尋/切換 ── */}
      <div
        className="sticky z-20 bg-[#0b0a08]/95 backdrop-blur-md border-b border-[#1f1f1f]"
        style={{ top: STICKY_TOP }}
      >
        {/* Search */}
        <div className="px-6 pt-3 pb-2.5">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666]" />
            <input
              type="text"
              placeholder="搜尋"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-[#161616] border border-[#2a2a2a] focus:border-[#c9a961]/40 rounded-full text-[15px] text-[#f5f1e8] placeholder-[#555] tracking-wider focus:outline-none transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <X size={14} className="text-[#666]" />
              </button>
            )}
          </div>
        </div>

        {/* 優雅下劃線 tabs + 食物/店家 視角切換 */}
        <div className="px-6">
          <div className="flex items-center justify-between border-b border-[#1f1f1f]">
            <div className="flex items-center gap-8">
              {TABS.map(t => (
                <button
                  key={t.value}
                  onClick={() => setActiveTab(t.value)}
                  className={`relative pb-3 pt-1 text-[15px] tracking-[0.3em] transition-colors ${
                    activeTab === t.value ? 'text-[#ead8aa]' : 'text-[#555] hover:text-[#888]'
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
            <div className="flex items-center rounded-full border border-[#2a2a2a] p-[3px] mb-1.5 text-[12px] tracking-[0.12em]">
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
                onClick={() => setActiveCity(null)}
                className={`flex-shrink-0 text-[12px] tracking-[0.2em] px-3.5 py-1.5 ${activeCity === null ? 'chip chip-active' : 'chip'}`}
              >
                全部
              </button>
              {cityCounts.map(([city, count]) => (
                <button
                  key={city}
                  onClick={() => setActiveCity(activeCity === city ? null : city)}
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
            onClick={() => setShowQuickAdd(true)}
            className="w-full mb-3 border border-dashed border-[#c9a961]/30 text-[#c9a961]/80 hover:border-[#c9a961]/60 hover:text-[#ead8aa] rounded-[14px] py-3.5 flex items-center justify-center gap-2 text-[13px] tracking-[0.2em] transition-colors"
          >
            <Plus size={15} />
            快速加吃過的店
          </button>
        )}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-4">— —</div>
            <p className="text-[#777] text-[15px] tracking-wider">
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

      {showTonight && (
        <TonightModal
          wantItems={wantItems}
          triedItems={triedItems}
          lastEatenByFoodId={lastEatenByFoodId}
          onOpen={onOpen}
          onClose={() => setShowTonight(false)}
          onQuickAdd={() => { setShowTonight(false); setShowQuickAdd(true); }}
        />
      )}

      {showQuickAdd && (
        <QuickAddRegularSheet
          onSave={async (item) => {
            // 新增失敗（store 已跳 toast 並回滾）就留在表單，不假裝成功
            const ok = await onAddRegular(item);
            if (!ok) return;
            setShowQuickAdd(false);
            // 加完切到「嘗過」且清掉縣市篩選，確保剛加的一定看得到
            setActiveTab('tried');
            setActiveCity(null);
          }}
          onClose={() => setShowQuickAdd(false)}
        />
      )}
    </div>
  );
}
