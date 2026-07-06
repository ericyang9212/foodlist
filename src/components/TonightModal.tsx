import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Shuffle, SlidersHorizontal, MapPin, Plus } from 'lucide-react';
import { mapsUrlForFood } from '../lib/maps';
import { isStale } from '../lib/stale';
import type { FoodItem } from '../types';

interface Props {
  wantItems: FoodItem[];   // 想吃（探索：試新的）
  triedItems: FoodItem[];  // 嘗過（回訪：吃過的安心牌）
  lastEatenByFoodId: Record<string, string>;
  onOpen: (item: FoodItem) => void;
  onClose: () => void;
  onQuickAdd?: () => void; // 回訪池是空的時候，給個「快速加常去的店」入口
}

const RECENT_DAYS = 30;
function eatenWithin(iso: string | undefined, days: number): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() < days * 86400000;
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

export function TonightModal({ wantItems, triedItems, lastEatenByFoodId, onOpen, onClose, onQuickAdd }: Props) {
  // 抽籤來源：想吃（探索）／回訪（吃過還想再吃）／全部（兩邊一起抽）。預設抽有東西的那邊。
  const [source, setSource] = useState<'want' | 'tried' | 'all'>(
    wantItems.length > 0 ? 'want' : triedItems.length > 0 ? 'tried' : 'all'
  );
  const [current, setCurrent] = useState<FoodItem | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [cuisineFilter, setCuisineFilter] = useState<string | null>(null);
  const [staleOnly, setStaleOnly] = useState(false);
  const [excludeRecent, setExcludeRecent] = useState(false);

  const candidates = useMemo(
    () => (source === 'want' ? wantItems : source === 'tried' ? triedItems : [...wantItems, ...triedItems]),
    [source, wantItems, triedItems]
  );

  // 換來源時把篩選歸零，避免帶著上一個來源的條件把新池子篩成空的
  const switchSource = (s: 'want' | 'tried' | 'all') => {
    if (s === source) return;
    setSource(s);
    setCityFilter(null);
    setCuisineFilter(null);
    setStaleOnly(false);
    setExcludeRecent(false);
    setShowFilters(false);
  };

  // 塵封：躺超過 3 個月還沒吃的
  const staleCount = useMemo(
    () => candidates.filter(i => isStale(i.createdAt)).length,
    [candidates]
  );

  // 最近吃過的候選數（只有 > 0 才顯示「排除最近吃過」選項，避免無效開關）
  const recentCount = useMemo(
    () => candidates.filter(i => eatenWithin(lastEatenByFoodId[i.id], RECENT_DAYS)).length,
    [candidates, lastEatenByFoodId]
  );

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
      if (staleOnly && !isStale(item.createdAt)) return false;
      if (excludeRecent && eatenWithin(lastEatenByFoodId[item.id], RECENT_DAYS)) return false;
      return true;
    });
  }, [candidates, cityFilter, cuisineFilter, staleOnly, excludeRecent, lastEatenByFoodId]);

  // pool「內容」變了才處理；物件換新但內容相同（realtime 重抓資料）不能害目前的抽選被換掉
  const poolKey = useMemo(() => pool.map(i => i.id).sort().join('|'), [pool]);
  const poolRef = useRef(pool);
  // render 期間不能寫 ref：每次 commit 後同步最新 pool（放在讀取它的 effect 之前，確保先跑）
  useEffect(() => { poolRef.current = pool; });

  useEffect(() => {
    const p = poolRef.current;
    setCurrent(prev => {
      // 目前抽到的還在 pool 裡 → 保留（但換成最新資料）；不在了才重抽
      if (prev) {
        const fresh = p.find(i => i.id === prev.id);
        if (fresh) return fresh;
      }
      return pickRandom(p);
    });
  }, [poolKey]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // modal 關閉時清掉跑到一半的動畫
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const shuffle = () => {
    if (pool.length <= 1 || shuffling) return;
    setShuffling(true);
    let count = 0;
    intervalRef.current = setInterval(() => {
      // 用 functional update 拿到最新值，每一跳都避開上一個
      setCurrent(prev => pickRandom(pool, prev ?? undefined));
      count++;
      if (count > 6) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        setShuffling(false);
      }
    }, 60);
  };

  // 縣市挑選提到最上面（想去哪先選，一鍵就抽那一帶）；其餘條件收在「更多條件」
  const hasCityChoices = cityCounts.length > 0;
  const hasAdvanced = staleCount > 0 || recentCount > 0 || cuisineCounts.length > 0;
  const advancedActive = cuisineFilter !== null || staleOnly || excludeRecent;
  const hasFilter = cityFilter !== null || advancedActive;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-6"
         onClick={onClose}>
      <div
        className="relative w-full max-w-sm bg-gradient-to-b from-[#131313] to-[#0d0c0a] border border-[#c9a961]/30 rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(201,169,97,0.15)] px-8 py-10 animate-fadein"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 icon-btn">
          <X size={18} />
        </button>

        <div className="text-center mb-6">
          <div className="text-[13px] tracking-[0.5em] text-[#c9a961]/70 mb-3">TONIGHT</div>
          <div className="h-[1px] w-12 bg-[#c9a961]/40 mx-auto" />
        </div>

        {/* 抽籤來源：想吃（試新的）／回訪（吃過的安心牌）／全部（兩邊一起抽） */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center rounded-full border border-[#2a2a2a] p-[3px] text-[13px] tracking-[0.1em]">
            {([
              ['want', '想吃', wantItems.length],
              ['tried', '回訪', triedItems.length],
              ['all', '全部', wantItems.length + triedItems.length],
            ] as const).map(([key, label, n]) => (
              <button
                key={key}
                onClick={() => switchSource(key)}
                className={`px-3.5 py-1.5 rounded-full transition-colors ${source === key ? 'bg-[#d6b974] text-[#100d07] font-medium' : 'text-[#8d877a]'}`}
              >
                {label}<span className="ml-1 opacity-70 text-[11px]">{n}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 縣市快選：想去哪先挑，選了就只抽那一帶 */}
        {hasCityChoices && (
          <div className="mb-6">
            <div className="text-[11px] tracking-[0.35em] text-[#8a8478] text-center mb-3">想去哪個縣市？</div>
            <div className="flex flex-wrap justify-center gap-1.5">
              <button
                onClick={() => setCityFilter(null)}
                className={`text-[12px] tracking-[0.15em] px-3 py-1.5 ${cityFilter === null ? 'chip chip-active' : 'chip'}`}
              >
                不限
              </button>
              {cityCounts.map(([city, count]) => (
                <button
                  key={city}
                  onClick={() => setCityFilter(cityFilter === city ? null : city)}
                  className={`text-[12px] tracking-[0.15em] px-3 py-1.5 ${cityFilter === city ? 'chip chip-active' : 'chip'}`}
                >
                  {city} · {count}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 更多條件：塵封 / 最近吃過 / 類型 */}
        {hasAdvanced && (
          <div className="mb-7">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-full flex items-center justify-center gap-2 py-2 text-[12px] tracking-[0.3em] transition-colors ${
                advancedActive ? 'text-[#c9a961]' : 'text-[#666] hover:text-[#c9a961]/80'
              }`}
            >
              <SlidersHorizontal size={13} />
              {advancedActive
                ? `已選 · ${[cuisineFilter, staleOnly ? '塵封' : null, excludeRecent ? '排除最近' : null].filter(Boolean).join(' · ')}`
                : '更多條件'}
            </button>

            {showFilters && (
              <div className="mt-3 space-y-3 pt-3 border-t border-[#1f1f1f]">
                {staleCount > 0 && (
                  <div>
                    <div className="text-[10px] tracking-[0.4em] text-[#666] mb-2">塵封</div>
                    <button
                      onClick={() => setStaleOnly(!staleOnly)}
                      className={`text-[11px] tracking-[0.2em] px-2.5 py-1 ${staleOnly ? 'chip chip-active' : 'chip'}`}
                    >
                      躺超過 3 個月 · {staleCount}
                    </button>
                  </div>
                )}

                {recentCount > 0 && (
                  <div>
                    <div className="text-[10px] tracking-[0.4em] text-[#666] mb-2">最近吃過</div>
                    <button
                      onClick={() => setExcludeRecent(!excludeRecent)}
                      className={`text-[11px] tracking-[0.2em] px-2.5 py-1 ${excludeRecent ? 'chip chip-active' : 'chip'}`}
                    >
                      排除近 30 天吃過 · {recentCount}
                    </button>
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

                {advancedActive && (
                  <button
                    onClick={() => { setCuisineFilter(null); setStaleOnly(false); setExcludeRecent(false); }}
                    className="w-full text-[11px] tracking-[0.3em] text-[#666] hover:text-[#c9a961] py-1.5 transition-colors"
                  >
                    清除條件
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {current ? (
          <>
            {/* 點名字看詳情；主要動作只留「帶我去 / 再抽」 */}
            <button
              onClick={() => { onOpen(current); onClose(); }}
              className={`block w-full text-center mb-9 transition-opacity active:opacity-70 ${shuffling ? 'opacity-60' : 'opacity-100'}`}
            >
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
              <div className="mt-2.5 text-[11px] tracking-[0.3em] text-[#5d574c]">點名字看詳情</div>
            </button>

            <div className="flex gap-2.5">
              <button
                onClick={() => window.open(mapsUrlForFood(current), '_blank', 'noopener,noreferrer')}
                className="btn-secondary flex-1 flex items-center justify-center gap-2 py-4 text-[15px] tracking-[0.3em]"
              >
                <MapPin size={15} />
                帶我去
              </button>
              <button
                onClick={shuffle}
                disabled={pool.length <= 1 || shuffling}
                className="btn-secondary flex-1 flex items-center justify-center gap-2 py-4 text-[15px] tracking-[0.3em] disabled:opacity-40"
              >
                <Shuffle size={15} />
                再抽一個
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-10">
            {hasFilter ? (
              <>
                <p className="text-[#777] text-[15px] tracking-wider mb-2">這個範圍沒有可抽的</p>
                <p className="text-[#555] text-[13px] tracking-widest">試試清除或換條件</p>
              </>
            ) : source === 'want' ? (
              <>
                <p className="text-[#777] text-[15px] tracking-wider mb-2">還沒有想吃的食物</p>
                <p className="text-[#555] text-[13px] tracking-widest">先去清單新增幾個吧</p>
              </>
            ) : source === 'tried' ? (
              <>
                <p className="text-[#777] text-[15px] tracking-wider mb-2">還沒有吃過的紀錄</p>
                <p className="text-[#555] text-[13px] tracking-widest mb-5">加幾間吃過的店，之後就能從這裡抽</p>
                {onQuickAdd && (
                  <button
                    onClick={onQuickAdd}
                    className="btn-secondary inline-flex items-center gap-2 px-5 py-2.5 text-[13px] tracking-[0.2em]"
                  >
                    <Plus size={14} />
                    快速加吃過的店
                  </button>
                )}
              </>
            ) : (
              <>
                <p className="text-[#777] text-[15px] tracking-wider mb-2">還沒有可以抽的</p>
                <p className="text-[#555] text-[13px] tracking-widest">先去清單新增，或加幾間吃過的</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
