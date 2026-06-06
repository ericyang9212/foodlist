import { useState, useEffect, useMemo } from 'react';
import { X, Shuffle, ChevronRight, SlidersHorizontal } from 'lucide-react';
import type { FoodItem } from '../types';

interface Props {
  candidates: FoodItem[]; // 從「想吃」清單來
  onOpen: (item: FoodItem) => void;
  onClose: () => void;
}

function pickRandom<T>(arr: T[], avoid?: T): T | null {
  if (arr.length === 0) return null;
  if (arr.length === 1) return arr[0];
  let pick = arr[Math.floor(Math.random() * arr.length)];
  let tries = 0;
  while (pick === avoid && tries < 10) {
    pick = arr[Math.floor(Math.random() * arr.length)];
    tries++;
  }
  return pick;
}

export function TonightModal({ candidates, onOpen, onClose }: Props) {
  const [current, setCurrent] = useState<FoodItem | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [cuisineFilter, setCuisineFilter] = useState<string | null>(null);

  // 從候選裡蒐集出可用的縣市 / 料理類型
  const cityCounts = useMemo(() => {
    const m = new Map<string, number>();
    candidates.forEach(item => {
      const set = new Set<string>();
      item.restaurants.forEach(r => { if (r.city) set.add(r.city); });
      set.forEach(c => m.set(c, (m.get(c) ?? 0) + 1));
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [candidates]);

  const cuisineCounts = useMemo(() => {
    const m = new Map<string, number>();
    candidates.forEach(item => {
      if (item.cuisineType) m.set(item.cuisineType, (m.get(item.cuisineType) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [candidates]);

  const pool = useMemo(() => {
    return candidates.filter(item => {
      if (cityFilter && !item.restaurants.some(r => r.city === cityFilter)) return false;
      if (cuisineFilter && item.cuisineType !== cuisineFilter) return false;
      return true;
    });
  }, [candidates, cityFilter, cuisineFilter]);

  // 篩選變動時重抽
  useEffect(() => {
    setCurrent(pickRandom(pool));
  }, [pool]);

  const shuffle = () => {
    if (pool.length <= 1) return;
    setShuffling(true);
    let count = 0;
    const interval = setInterval(() => {
      setCurrent(pickRandom(pool, current ?? undefined));
      count++;
      if (count > 6) {
        clearInterval(interval);
        setShuffling(false);
      }
    }, 60);
  };

  const hasFilter = cityFilter !== null || cuisineFilter !== null;
  const canFilter = cityCounts.length > 0 || cuisineCounts.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-6"
         onClick={onClose}>
      <div
        className="relative w-full max-w-sm bg-[#0f0f0f] border border-[#c9a961]/30 rounded-[8px] shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(201,169,97,0.15)] px-8 py-10"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 icon-btn">
          <X size={18} />
        </button>

        <div className="text-center mb-7">
          <div className="text-[13px] tracking-[0.5em] text-[#c9a961]/70 mb-3">TONIGHT</div>
          <div className="h-[1px] w-12 bg-[#c9a961]/40 mx-auto" />
        </div>

        {/* 篩選區 */}
        {canFilter && (
          <div className="mb-7">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-full flex items-center justify-center gap-2 py-2 text-[12px] tracking-[0.3em] transition-colors ${
                hasFilter ? 'text-[#c9a961]' : 'text-[#666] hover:text-[#c9a961]/80'
              }`}
            >
              <SlidersHorizontal size={13} />
              {hasFilter
                ? `已篩選 · ${[cityFilter, cuisineFilter].filter(Boolean).join(' · ')}`
                : '加篩選條件'}
            </button>

            {showFilters && (
              <div className="mt-3 space-y-3 pt-3 border-t border-[#1f1f1f]">
                {cityCounts.length > 0 && (
                  <div>
                    <div className="text-[10px] tracking-[0.4em] text-[#666] mb-2">縣市</div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setCityFilter(null)}
                        className={`text-[11px] tracking-[0.2em] px-2.5 py-1 ${cityFilter === null ? 'chip chip-active' : 'chip'}`}
                      >
                        全部
                      </button>
                      {cityCounts.map(([city, count]) => (
                        <button
                          key={city}
                          onClick={() => setCityFilter(cityFilter === city ? null : city)}
                          className={`text-[11px] tracking-[0.2em] px-2.5 py-1 ${cityFilter === city ? 'chip chip-active' : 'chip'}`}
                        >
                          {city} · {count}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {cuisineCounts.length > 0 && (
                  <div>
                    <div className="text-[10px] tracking-[0.4em] text-[#666] mb-2">類型</div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setCuisineFilter(null)}
                        className={`text-[11px] tracking-[0.2em] px-2.5 py-1 ${cuisineFilter === null ? 'chip chip-active' : 'chip'}`}
                      >
                        全部
                      </button>
                      {cuisineCounts.map(([type, count]) => (
                        <button
                          key={type}
                          onClick={() => setCuisineFilter(cuisineFilter === type ? null : type)}
                          className={`text-[11px] tracking-[0.2em] px-2.5 py-1 ${cuisineFilter === type ? 'chip chip-active' : 'chip'}`}
                        >
                          {type} · {count}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {hasFilter && (
                  <button
                    onClick={() => { setCityFilter(null); setCuisineFilter(null); }}
                    className="w-full text-[11px] tracking-[0.3em] text-[#666] hover:text-[#c9a961] py-1.5 transition-colors"
                  >
                    清除全部篩選
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {current ? (
          <>
            <div className={`text-center mb-10 transition-opacity ${shuffling ? 'opacity-60' : 'opacity-100'}`}>
              <h2 className="text-[36px] text-gold-gradient font-medium tracking-[0.1em] leading-tight mb-4">
                {current.name}
              </h2>
              <div className="flex items-center justify-center gap-2.5 text-[14px] text-[#8a8478] tracking-widest">
                {current.cuisineType && <span>{current.cuisineType}</span>}
                {current.restaurants.length > 0 && (
                  <>
                    {current.cuisineType && <span className="text-[#3a3a3a]">·</span>}
                    <span>{current.restaurants.length} 家候選</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => { onOpen(current); onClose(); }}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-[15px] tracking-[0.3em]"
              >
                就決定它了
                <ChevronRight size={18} strokeWidth={2.5} />
              </button>
              <button
                onClick={shuffle}
                disabled={pool.length <= 1 || shuffling}
                className="btn-secondary w-full flex items-center justify-center gap-2 py-4 text-[14px] tracking-[0.3em] disabled:opacity-40"
              >
                <Shuffle size={14} />
                再抽一個
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-[#777] text-[15px] tracking-wider mb-2">
              {hasFilter ? '這個範圍沒有想吃的食物' : '沒有想吃的食物'}
            </p>
            <p className="text-[#555] text-[13px] tracking-widest">
              {hasFilter ? '試試清除或換條件' : '先去清單新增幾個吧'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
