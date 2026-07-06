import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { MapPin, Trash2, Compass, Loader2 } from 'lucide-react';
import { Thumb } from '../components/Thumb';
import type { Foodprint } from '../types';
import type { FlyTarget } from '../components/FoodprintsMap';
import { resolveFoodprintLocation } from '../lib/foodprintGeo';

// 地圖只在切到「足跡」分頁時才載入，避免 Leaflet 拖慢首次開啟
const FoodprintsMap = lazy(() =>
  import('../components/FoodprintsMap').then(m => ({ default: m.FoodprintsMap }))
);

interface Props {
  items: Foodprint[];
  onDelete: (id: string) => void;
}

// 想吃新的：當下抓 GPS 把 Google Maps 定位到你附近；拒絕授權就退回一般「餐廳」搜尋
function exploreNearby() {
  const openMaps = (center?: string) => {
    const url = center
      ? `https://www.google.com/maps/search/餐廳/@${center},15z`
      : 'https://www.google.com/maps/search/餐廳';
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  if (!navigator.geolocation) return openMaps();
  navigator.geolocation.getCurrentPosition(
    pos => openMaps(`${pos.coords.latitude},${pos.coords.longitude}`),
    () => openMaps(),
    { timeout: 10000 }
  );
}

function monthLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const PAGE_SIZE = 30;

type SnapPoint = 'collapsed' | 'half' | 'full';

const COLLAPSED_HEIGHT = 64;
const HALF_RATIO = 0.38;
const FULL_RATIO = 0.82;
// 留給底部 nav bar 的高度，讓抽屜（連同收起時的把手）不會被蓋住
const NAV_RESERVE = 'calc(env(safe-area-inset-bottom) + 80px)';

export function FoodprintsPage({ items, onDelete }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [flyTarget, setFlyTarget] = useState<FlyTarget | null>(null);
  const [snap, setSnap] = useState<SnapPoint>('half');
  const [dragHeight, setDragHeight] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const snapHeights = useMemo(() => ({
    collapsed: COLLAPSED_HEIGHT,
    half: Math.round(containerHeight * HALF_RATIO),
    full: Math.round(containerHeight * FULL_RATIO),
  }), [containerHeight]);

  const drawerHeight = dragHeight ?? snapHeights[snap];

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startY: e.clientY, startHeight: snapHeights[snap] };
    setDragHeight(snapHeights[snap]);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dy = e.clientY - dragRef.current.startY;
    const next = Math.min(snapHeights.full, Math.max(COLLAPSED_HEIGHT, dragRef.current.startHeight - dy));
    setDragHeight(next);
  }

  function endDrag() {
    if (dragHeight == null) { dragRef.current = null; return; }
    const candidates: [SnapPoint, number][] = [
      ['collapsed', snapHeights.collapsed],
      ['half', snapHeights.half],
      ['full', snapHeights.full],
    ];
    let nearest = candidates[0];
    for (const c of candidates) {
      if (Math.abs(c[1] - dragHeight) < Math.abs(nearest[1] - dragHeight)) nearest = c;
    }
    setSnap(nearest[0]);
    setDragHeight(null);
    dragRef.current = null;
  }

  function cycleSnap() {
    setSnap(s => (s === 'collapsed' ? 'half' : s === 'half' ? 'full' : 'collapsed'));
  }

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

  const grouped = useMemo(() => {
    const m = new Map<string, Foodprint[]>();
    visibleItems.forEach(p => {
      const key = monthLabel(p.ateAt);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    });
    return [...m.entries()];
  }, [visibleItems]);

  const storeCount = useMemo(
    () => new Set(items.map(p => p.restaurantName || p.foodName)).size,
    [items]
  );

  function handleCardClick(item: Foodprint) {
    const loc = resolveFoodprintLocation(item);
    if (!loc) return;
    setFlyTarget({ ...loc, label: item.restaurantName || item.foodName });
    if (snap === 'full') setSnap('half');
  }

  return (
    // 地圖全屏鋪滿，時間軸改成右側/下方可拉開的抽屜蓋在上面
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#0a0a0a]">
      <div className="absolute inset-0">
        <Suspense
          fallback={
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 size={22} className="animate-spin text-[#c9a961]/70" />
            </div>
          }
        >
          <FoodprintsMap items={items} flyTarget={flyTarget} />
        </Suspense>
      </div>

      <div
        className="absolute top-0 left-0 right-0 z-10 px-6 pointer-events-none"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 64px)' }}
      >
        <h1 className="text-[22px] font-medium text-gold-gradient tracking-[0.15em] leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
          食 物 足 跡
        </h1>
      </div>

      <div
        className="absolute left-0 right-0 z-20 bg-[#0f0d0a]/97 backdrop-blur-sm border-t border-[#c9a961]/25 rounded-t-[18px] shadow-[0_-8px_30px_rgba(0,0,0,0.55)] flex flex-col"
        style={{
          bottom: NAV_RESERVE,
          height: drawerHeight,
          transition: dragHeight == null ? 'height 280ms cubic-bezier(0.32,0.72,0,1)' : 'none',
        }}
      >
        <div
          className="pt-2.5 pb-2 flex justify-center cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={cycleSnap}
        >
          <div className="w-10 h-1.5 rounded-full bg-[#c9a961]/40" />
        </div>

        <div className="flex items-center justify-between px-5 pb-3 border-b border-[#1a1a1a] flex-shrink-0">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[15px] text-[#f5f1e8] tracking-[0.2em] font-medium">足跡時間軸</h2>
            {storeCount > 0 && (
              <span className="text-[11px] text-[#c9a961]/70 tracking-wider">{storeCount} 家店</span>
            )}
          </div>
          <button
            onClick={exploreNearby}
            className="icon-btn !p-1.5"
            title="在 Google Maps 找附近的店"
          >
            <Compass size={17} className="text-[#c9a961]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8">
          {items.length > 0 ? (
            <>
              <div className="relative pl-1">
                <div className="absolute left-[6px] top-1 bottom-1 w-[1px] bg-gradient-to-b from-[#c9a961]/50 via-[#c9a961]/20 to-transparent" />
                <div className="space-y-7">
                  {grouped.map(([month, prints]) => (
                    <div key={month} className="relative pl-6">
                      <div className="absolute left-0 top-1 w-[11px] h-[11px] rounded-full bg-[#0f0d0a] border-2 border-[#c9a961]" />
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[12px] tracking-[0.3em] text-[#c9a961]/80">{month}</span>
                        <div className="h-[1px] flex-1 bg-[#1a1a1a]" />
                        <span className="text-[10px] text-[#666] tracking-widest">{prints.length}</span>
                      </div>
                      <div className="space-y-2.5">
                        {prints.map(p => (
                          <FoodprintCard
                            key={p.id}
                            item={p}
                            onDelete={() => onDelete(p.id)}
                            onClick={() => handleCardClick(p)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {visibleCount < items.length && (
                <button
                  onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  className="w-full mt-4 py-2.5 text-[12px] tracking-[0.2em] text-[#c9a961]/80 border border-[#1f1f1f] rounded-[6px] hover:border-[#c9a961]/40 hover:text-[#c9a961] transition-colors"
                >
                  載入更多（剩 {items.length - visibleCount} 筆）
                </button>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-3">— —</div>
              <p className="text-[#777] text-[14px] tracking-wider mb-2">還沒有任何足跡</p>
              <p className="text-[#555] text-[12px] tracking-widest">
                在食物詳情頁按「今天吃了」就會出現
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FoodprintCard({ item, onDelete, onClick }: { item: Foodprint; onDelete: () => void; onClick: () => void }) {
  const region = [item.restaurantCity, item.restaurantArea].filter(Boolean).join(' ');
  return (
    <div
      className="card-surface rounded-[8px] p-4 cursor-pointer active:scale-[0.99] transition-transform"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="text-[11px] tracking-[0.25em] text-[#c9a961]/80 w-12 flex-shrink-0 mt-0.5">
          {dateLabel(item.ateAt)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[16px] text-[#f5f1e8] font-medium tracking-wide leading-tight">
            {item.foodName}
          </h4>
          {(item.restaurantName || region) && (
            <div className="flex items-center gap-1.5 mt-1 text-[#8a8478]">
              <MapPin size={11} />
              <span className="text-[12px] tracking-wide">
                {[item.restaurantName, region].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
          {item.note && (
            <p className="text-[12px] text-[#c9a961]/70 italic tracking-wide mt-2 leading-relaxed">
              「{item.note}」
            </p>
          )}
        </div>
        {item.photoUrl && (
          <div className="w-14 h-14 rounded-[4px] border border-[#2a2a2a] overflow-hidden flex-shrink-0">
            <Thumb src={item.photoUrl} className="w-full h-full object-cover" />
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('刪除這則足跡？')) onDelete();
          }}
          className="icon-btn !p-1 hover:!text-[#a85959] hover:!bg-[#a85959]/10 flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
