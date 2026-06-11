import { useMemo } from 'react';
import { MapPin, Trash2, Compass, ExternalLink } from 'lucide-react';
import type { Foodprint } from '../types';

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

export function FoodprintsPage({ items, onDelete }: Props) {
  const stats = useMemo(() => {
    const foods = new Set(items.map(i => i.foodId));
    const restaurants = new Set(items.map(i => `${i.restaurantName ?? ''}|${i.restaurantCity ?? ''}`).filter(s => s !== '|'));
    const regions = new Set(items.map(i => i.restaurantCity).filter(Boolean));
    return {
      total: items.length,
      foods: foods.size,
      restaurants: restaurants.size,
      regions: regions.size,
    };
  }, [items]);

  const cuisineCounts = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach(i => {
      if (i.cuisineType) m.set(i.cuisineType, (m.get(i.cuisineType) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [items]);

  const grouped = useMemo(() => {
    const m = new Map<string, Foodprint[]>();
    items.forEach(p => {
      const key = monthLabel(p.ateAt);
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    });
    return [...m.entries()];
  }, [items]);

  const maxCuisine = cuisineCounts[0]?.[1] ?? 1;

  return (
    // 底部主分頁：單一捲動，頂部留出跑馬燈/瀏海空間
    <div
      className="h-full overflow-y-auto bg-[#0a0a0a] px-6 pb-28"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 72px)' }}
    >
        {/* Title */}
        <div className="mb-7">
          <h1 className="text-[28px] font-medium text-gold-gradient tracking-[0.15em] leading-tight mb-2">
            食 物 足 跡
          </h1>
          <p className="text-[12px] text-[#777] tracking-wider leading-relaxed">
            把吃過的地方，慢慢拼成你自己的美食地圖
          </p>
          <div className="mt-3 h-[1px] bg-gradient-to-r from-[#c9a961]/30 to-transparent" />
        </div>

        {/* 統計 */}
        {items.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 mb-8">
              <StatCard label="紀錄" value={stats.total} />
              <StatCard label="食物" value={stats.foods} />
              <StatCard label="店家" value={stats.restaurants} />
              <StatCard label="城市" value={stats.regions} />
            </div>

            {/* 料理類型分布 */}
            {cuisineCounts.length > 0 && (
              <div className="mb-9">
                <div className="text-[10px] tracking-[0.4em] text-[#c9a961]/60 mb-3">TASTE</div>
                <div className="space-y-2">
                  {cuisineCounts.map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-[13px] text-[#d6d0c0] w-14 tracking-wider">{type}</span>
                      <div className="flex-1 h-[3px] bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#c9a961] to-[#e6c87a] rounded-full transition-all"
                          style={{ width: `${(count / maxCuisine) * 100}%` }}
                        />
                      </div>
                      <span className="text-[12px] text-[#8a8478] tracking-wider w-8 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 時間軸 */}
            <div>
              <div className="text-[10px] tracking-[0.4em] text-[#c9a961]/60 mb-4">TIMELINE</div>
              <div className="space-y-7">
                {grouped.map(([month, prints]) => (
                  <div key={month}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[12px] tracking-[0.3em] text-[#c9a961]/80">{month}</span>
                      <div className="h-[1px] flex-1 bg-[#1a1a1a]" />
                      <span className="text-[10px] text-[#666] tracking-widest">{prints.length}</span>
                    </div>
                    <div className="space-y-2.5">
                      {prints.map(p => (
                        <FoodprintCard key={p.id} item={p} onDelete={() => onDelete(p.id)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-3">— —</div>
            <p className="text-[#777] text-[14px] tracking-wider mb-2">還沒有任何足跡</p>
            <p className="text-[#555] text-[12px] tracking-widest">
              在食物詳情頁按「今天吃了」就會出現
            </p>
          </div>
        )}

        {/* 想吃新的？交給 Google Maps 找附近 */}
        <div className="mt-10 pt-6 border-t border-[#1f1f1f]">
          <div className="text-[11px] tracking-[0.4em] text-[#555] mb-3">EXPLORE BEYOND</div>
          <button
            onClick={exploreNearby}
            className="w-full bg-[#0f0f0f] border border-[#c9a961]/30 hover:border-[#c9a961]/60 hover:bg-[#c9a961]/5 rounded-[6px] active:scale-[0.99] transition-all py-5 px-5 flex items-center gap-4"
          >
            <Compass size={26} className="text-[#c9a961] flex-shrink-0" />
            <div className="flex-1 text-left">
              <div className="text-[15px] text-[#f5f1e8] tracking-wider font-medium">在 Google Maps 找附近的店</div>
              <div className="text-[12px] text-[#777] tracking-wider mt-1">想吃新東西時交給 Google</div>
            </div>
            <ExternalLink size={16} className="text-[#666]" />
          </button>
        </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#0f0f0f] border border-[#1f1f1f] rounded-[5px] py-4 px-3 text-center">
      <div className="text-[28px] text-gold-gradient font-medium tracking-wide leading-none mb-1">
        {value}
      </div>
      <div className="text-[10px] tracking-[0.4em] text-[#777]">{label}</div>
    </div>
  );
}

function FoodprintCard({ item, onDelete }: { item: Foodprint; onDelete: () => void }) {
  const region = [item.restaurantCity, item.restaurantArea].filter(Boolean).join(' ');
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-[5px] p-4">
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
            <img src={item.photoUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
