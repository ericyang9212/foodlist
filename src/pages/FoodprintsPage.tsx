import { useMemo, useState } from 'react';
import { MapPin, Trash2, Compass, X } from 'lucide-react';
import { Thumb } from '../components/Thumb';
import { TaiwanMap } from '../components/TaiwanMap';
import type { Foodprint } from '../types';
import { resolveCityName } from '../lib/foodprintGeo';

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
const MAP_HEIGHT = 280;

export function FoodprintsPage({ items, onDelete }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

  // 各縣市的足跡數（決定地圖填色深淺）跟店名清單（決定底部 panel 內容）
  const { cityCounts, storesByCity } = useMemo(() => {
    const counts: Record<string, number> = {};
    const stores = new Map<string, string[]>();
    items.forEach(p => {
      const city = resolveCityName(p);
      if (!city) return;
      counts[city] = (counts[city] || 0) + 1;
      const label = p.restaurantName || p.foodName;
      const list = stores.get(city) ?? [];
      if (!list.includes(label)) list.push(label);
      stores.set(city, list);
    });
    return { cityCounts: counts, storesByCity: stores };
  }, [items]);

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
    const city = resolveCityName(item);
    if (!city) return;
    setSelectedCity(city);
  }

  function handleSelectCity(city: string) {
    setSelectedCity(prev => (prev === city ? null : city));
  }

  return (
    // 整頁單一捲動容器：地圖固定高度、正常排版在上方，時間軸接在下面一起捲動
    <div className="h-full overflow-y-auto bg-[#0a0a0a]">
      <div className="px-6 pb-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 64px)' }}>
        <h1 className="text-[22px] font-medium text-gold-gradient tracking-[0.15em] leading-tight">
          食 物 足 跡
        </h1>
      </div>

      <div className="relative w-full" style={{ height: MAP_HEIGHT }} onClick={() => setSelectedCity(null)}>
        <TaiwanMap counts={cityCounts} onSelect={handleSelectCity} />

        {Object.keys(cityCounts).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[13px] text-[#76705f] tracking-wider text-center px-8 bg-[#0b0a08]/80 py-3 rounded-[10px]">
              還沒有標上地圖的足跡<br />記錄時填了縣市就會出現在這裡
            </p>
          </div>
        )}

        {selectedCity && (
          <div
            className="absolute left-3 right-3 bottom-3 card-surface rounded-[8px] p-3.5 bg-[#141210]/95 border border-[#2a2a2a] max-h-[55%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline gap-2 mb-2">
              <h3 className="text-[14px] text-[#f5f1e8] font-medium tracking-wide">{selectedCity}</h3>
              <span className="text-[11px] text-[#c9a961]/80 tracking-wider">
                {(storesByCity.get(selectedCity) ?? []).length} 家店
              </span>
              <button
                onClick={() => setSelectedCity(null)}
                className="icon-btn !p-1 ml-auto"
                title="關閉"
              >
                <X size={14} />
              </button>
            </div>
            {(storesByCity.get(selectedCity)?.length ?? 0) > 0 ? (
              <>
                <ul className="space-y-1">
                  {(storesByCity.get(selectedCity) ?? []).slice(0, 5).map(name => (
                    <li key={name} className="text-[12px] text-[#a89a7d] tracking-wide truncate">
                      {name}
                    </li>
                  ))}
                </ul>
                {(storesByCity.get(selectedCity)!.length > 5) && (
                  <p className="text-[11px] text-[#666] tracking-wider mt-1.5">
                    還有 {storesByCity.get(selectedCity)!.length - 5} 家
                  </p>
                )}
              </>
            ) : (
              <p className="text-[12px] text-[#666] tracking-wide">還沒有這個縣市的足跡</p>
            )}
          </div>
        )}
      </div>

      <div className="px-5 pt-5 pb-28">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1a1a1a]">
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

        {items.length > 0 ? (
          <>
            <div className="max-h-[50vh] overflow-y-auto pr-1">
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
