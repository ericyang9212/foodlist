import { useMemo, useState } from 'react';
import { MapPin, Trash2, Compass, X, ChevronDown, Plus } from 'lucide-react';
import { Thumb } from '../components/Thumb';
import { TaiwanMap } from '../components/TaiwanMap';
import type { TownPoint } from '../components/TaiwanMap';
import { TOWN_POINTS } from '../lib/twTownPoints';
import { EmptyMark } from '../components/EmptyMark';
import type { Foodprint } from '../types';
import { resolveCityName } from '../lib/foodprintGeo';

interface Props {
  items: Foodprint[];
  // 足跡沒有自己的照片時，退回顯示該食物的照片（照片常加在食物上而非足跡上）
  imageByFoodId: Record<string, string>;
  onDelete: (id: string) => void;
  onQuickLog: () => void;
}

// 想吃新的：同步開 Google Maps 搜「餐廳」。
// 不先抓 GPS —— async 回呼裡的 window.open 會被行動瀏覽器當非手勢動作擋掉，
// 而行動版 Google Maps 本來就會以目前位置為中心搜尋，先定位是多餘的。
function exploreNearby() {
  window.open('https://www.google.com/maps/search/餐廳', '_blank', 'noopener,noreferrer');
}

function monthLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月`;
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const DEFAULT_EXPANDED_MONTHS = 2;

function dateLabel(iso: string) {
  const d = new Date(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const PAGE_SIZE = 30;
const MAP_HEIGHT = 280;

// 有對應食物的才算「去了一家店」；實現願望產生的足跡沒有 foodId，
// 它可能是「去海邊走走」這種根本不是店的東西
const isPlaceVisit = (p: Foodprint) => !!p.foodId;

export function FoodprintsPage({ items, imageByFoodId, onDelete, onQuickLog }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);

  // 各縣市的足跡數（決定地圖填色深淺）跟店名清單（決定底部 panel 內容）
  const { cityCounts, storesByCity } = useMemo(() => {
    const counts: Record<string, number> = {};
    const stores = new Map<string, string[]>();
    items.forEach(p => {
      const city = resolveCityName(p);
      if (!city) return;
      // 地圖著色算全部足跡（實現的願望也是真的去過那裡）；
      // 但底下的店名清單只列真的去了店的，不然願望文字會混在店名裡
      counts[city] = (counts[city] || 0) + 1;
      if (!isPlaceVisit(p)) return;
      const label = p.restaurantName || p.foodName;
      const list = stores.get(city) ?? [];
      if (!list.includes(label)) list.push(label);
      stores.set(city, list);
    });
    return { cityCounts: counts, storesByCity: stores };
  }, [items]);

  // 鄉鎮亮點：只有填了鄉鎮、而且鄉鎮名字查得到座標的足跡才會有點。
  // 舊資料裡自由輸入的值（例如「北港」而非「北港鎮」）查不到，就自動略過不畫。
  const townPoints = useMemo(() => {
    const acc = new Map<string, TownPoint>();
    items.forEach(p => {
      const county = resolveCityName(p);
      if (!county || !p.restaurantArea) return;
      const xy = TOWN_POINTS[county]?.[p.restaurantArea];
      if (!xy) return;
      const key = `${county}/${p.restaurantArea}`;
      const hit = acc.get(key);
      if (hit) hit.count += 1;
      else acc.set(key, { county, town: p.restaurantArea, x: xy[0], y: xy[1], count: 1 });
    });
    return [...acc.values()];
  }, [items]);

  const grouped = useMemo(() => {
    const m = new Map<string, { label: string; prints: Foodprint[] }>();
    visibleItems.forEach(p => {
      const key = monthKey(p.ateAt);
      if (!m.has(key)) m.set(key, { label: monthLabel(p.ateAt), prints: [] });
      m.get(key)!.prints.push(p);
    });
    return [...m.entries()].map(([key, v]) => ({ key, ...v }));
  }, [visibleItems]);

  function isMonthCollapsed(key: string, index: number) {
    return collapsedMonths[key] ?? index >= DEFAULT_EXPANDED_MONTHS;
  }

  function toggleMonth(key: string, index: number) {
    setCollapsedMonths(prev => ({ ...prev, [key]: !isMonthCollapsed(key, index) }));
  }

  // 「N 家店」只算真的去了店的足跡：實現願望的那種（沒有 foodId）算進去會讓數字虛胖，
  // 「想睡到自然醒」也不是一家店
  const storeCount = useMemo(
    () => new Set(items.filter(isPlaceVisit).map(p => p.restaurantName || p.foodName)).size,
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
    // 合併主畫面裡的「足跡」段落（主軸）：地圖固定高度在上，時間軸接在下面，
    // 一起跟著 HomePage 的捲動容器捲——這裡不再自己捲。
    <div>
      <div className="px-6 pt-5 pb-4 flex items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-2">FOODPRINTS</div>
          <h2 className="t-title">
            食物足跡
          </h2>
        </div>
        {/* 剛吃了清單沒有的店 → 直接在這裡記，會一併加進「嘗過」 */}
        <button
          onClick={onQuickLog}
          className="btn-secondary flex items-center gap-1.5 text-[12px] px-3.5 py-2 flex-shrink-0"
        >
          <Plus size={14} />
          記一筆
        </button>
      </div>

      <div className="relative w-full" style={{ height: MAP_HEIGHT }} onClick={() => setSelectedCity(null)}>
        <TaiwanMap counts={cityCounts} townPoints={townPoints} onSelect={handleSelectCity} />

        {Object.keys(cityCounts).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="t-caption text-center px-5 bg-surface/90 backdrop-blur-sm py-3 rounded-[16px] shadow-[var(--shadow-card)]">
              還沒有標上地圖的足跡<br />記錄時填了縣市就會出現在這裡
            </p>
          </div>
        )}

        {selectedCity && (
          <div
            className="absolute left-3 right-3 bottom-3 card-surface rounded-[18px] p-3.5 max-h-[55%] flex flex-col animate-rise"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-baseline gap-2 mb-2 flex-shrink-0">
              <h3 className="t-heading">{selectedCity}</h3>
              <span className="text-[12px] font-medium text-gold">
                {(storesByCity.get(selectedCity) ?? []).length} 家店
              </span>
              <button
                onClick={() => setSelectedCity(null)}
                className="icon-btn !p-1 ml-auto" aria-label="關閉縣市篩選"
                title="關閉"
              >
                <X size={14} />
              </button>
            </div>
            {(storesByCity.get(selectedCity)?.length ?? 0) > 0 ? (
              <ul className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                {(storesByCity.get(selectedCity) ?? []).map(name => (
                  <li key={name} className="text-[12px] text-muted truncate">
                    {name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12px] text-muted">還沒有這個縣市的足跡</p>
            )}
          </div>
        )}
      </div>

      <div className="px-5 pt-5 pb-28">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-separator">
          <div className="flex items-baseline gap-2">
            <h2 className="t-heading">足跡時間軸</h2>
            {storeCount > 0 && (
              <span className="text-[12px] font-medium text-gold">{storeCount} 家店</span>
            )}
          </div>
          <button
            onClick={exploreNearby}
            className="icon-btn !p-1.5" aria-label="在 Google Maps 找附近的店"
            title="在 Google Maps 找附近的店"
          >
            <Compass size={17} className="text-gold" />
          </button>
        </div>

        {items.length > 0 ? (
          <>
            {/* 併成單一頁面後不再套內層捲動：時間軸直接跟著整頁捲，
                手機上少一層「捲動區裡的捲動區」 */}
            <div className="pr-1">
              <div className="relative pl-1">
                <div className="absolute left-[6px] top-1 bottom-1 w-[2px] rounded-full bg-gradient-to-b from-gold via-gold/40 to-transparent" />
                <div className="space-y-7">
                  {grouped.map((group, index) => {
                    const collapsed = isMonthCollapsed(group.key, index);
                    return (
                      <div key={group.key} className="relative pl-6">
                        <div className="absolute left-0 top-1 w-[11px] h-[11px] rounded-full bg-surface border-2 border-gold" />
                        <button
                          onClick={() => toggleMonth(group.key, index)}
                          className="flex items-center gap-3 mb-3 w-full text-left"
                        >
                          <span className="eyebrow">{group.label}</span>
                          <div className="h-[1px] flex-1 bg-separator" />
                          <span className="text-[11px] font-semibold text-gold bg-gold-soft px-2 py-0.5 rounded-full">
                            {group.prints.length}
                          </span>
                          <ChevronDown
                            size={14}
                            className={`text-muted transition-transform duration-300 ease-[var(--ease-ios)] flex-shrink-0 ${
                              collapsed ? '-rotate-90' : ''
                            }`}
                          />
                        </button>
                        <div
                          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                          style={{ gridTemplateRows: collapsed ? '0fr' : '1fr' }}
                        >
                          <div className="overflow-hidden">
                            <div className="space-y-2.5 stagger">
                              {group.prints.map(p => (
                                <FoodprintCard
                                  key={p.id}
                                  item={p}
                                  photoSrc={p.photoUrl ?? (p.foodId ? imageByFoodId[p.foodId] : undefined)}
                                  onDelete={() => onDelete(p.id)}
                                  onClick={() => handleCardClick(p)}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            {visibleCount < items.length && (
              <button
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="btn-neutral w-full mt-4 py-3 text-[13px]"
              >
                載入更多（剩 {items.length - visibleCount} 筆）
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <EmptyMark className="mb-3" />
            <p className="text-muted text-[14px] mb-2">還沒有任何足跡</p>
            <p className="text-muted text-[12px]">
              在食物詳情頁按「今天吃了」就會出現
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FoodprintCard({ item, photoSrc, onDelete, onClick }: {
  item: Foodprint; photoSrc?: string; onDelete: () => void; onClick: () => void;
}) {
  const region = [item.restaurantCity, item.restaurantArea].filter(Boolean).join(' ');
  return (
    <div
      className="card-surface rounded-[16px] p-4 cursor-pointer transition-transform duration-200 ease-[var(--ease-out-quint)] active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="text-[12px] font-semibold text-gold w-12 flex-shrink-0 mt-0.5 tabular-nums">
          {dateLabel(item.ateAt)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="t-heading">
            {item.foodName}
          </h4>
          {(item.restaurantName || region) && (
            <div className="flex items-center gap-1.5 mt-1 text-muted">
              <MapPin size={11} />
              <span className="text-[12px]">
                {[item.restaurantName, region].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
          {item.note && (
            <p className="t-caption italic mt-2">
              「{item.note}」
            </p>
          )}
        </div>
        {photoSrc && (
          <div className="w-14 h-14 rounded-[12px] bg-fill overflow-hidden flex-shrink-0">
            <Thumb src={photoSrc} className="w-full h-full object-cover" />
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('刪除這則足跡？')) onDelete();
          }}
          className="icon-btn !p-1 hover:!text-danger hover:!bg-danger-soft flex-shrink-0" aria-label="刪除足跡"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
