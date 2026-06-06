import { useState, useMemo } from 'react';
import { Navigation, MapPin, ExternalLink, Compass, Check, BookOpen } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import type { FoodItem, Restaurant } from '../types';

interface Props {
  items: FoodItem[];
  imageByFoodId: Record<string, string>;
  onOpen: (item: FoodItem) => void;
  onMarkTried: (item: FoodItem) => void;
}

function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m)}M` : `${(m / 1000).toFixed(1)}KM`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 週前`;
  if (days < 365) return `${Math.floor(days / 30)} 個月前`;
  return `${Math.floor(days / 365)} 年前`;
}

function googleMapsUrlForRestaurant(r: Restaurant): string {
  if (r.googleMapsUrl) return r.googleMapsUrl;
  const q = encodeURIComponent([r.name, r.city, r.area, r.address].filter(Boolean).join(' '));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

const RADIUS_OPTIONS = [500, 1000, 2000, 5000];

type Hit = {
  item: FoodItem;
  restaurant: Restaurant;
  dist: number;
};

export function NearbyPage({ items, imageByFoodId, onOpen, onMarkTried }: Props) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(2000);

  const getLocation = () => {
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      () => { setError('無法取得位置，請確認瀏覽器授權'); setLoading(false); },
      { timeout: 10000 }
    );
  };

  const { triedHits, wantHits } = useMemo(() => {
    if (!location) return { triedHits: [] as Hit[], wantHits: [] as Hit[] };
    const tried: Hit[] = [];
    const want: Hit[] = [];
    items.forEach(item => {
      if (item.status !== 'tried' && item.status !== 'want') return;
      const nearest = item.restaurants.reduce<{ r: Restaurant; d: number } | null>((best, r) => {
        if (!r.lat || !r.lng) return best;
        const d = getDistance(location.lat, location.lng, r.lat, r.lng);
        if (d > radius) return best;
        if (!best || d < best.d) return { r, d };
        return best;
      }, null);
      if (!nearest) return;
      const hit: Hit = { item, restaurant: nearest.r, dist: nearest.d };
      (item.status === 'tried' ? tried : want).push(hit);
    });
    tried.sort((a, b) => a.dist - b.dist);
    want.sort((a, b) => a.dist - b.dist);
    return { triedHits: tried, wantHits: want };
  }, [items, location, radius]);

  const exploreOnGoogleMaps = () => {
    if (!location) return;
    const url = `https://www.google.com/maps/search/餐廳/@${location.lat},${location.lng},15z`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div
        className="px-6 pb-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 84px)' }}
      >
        <div className="text-[12px] tracking-[0.5em] text-[#c9a961]/70 mb-3">FOOD CONNECTIONS</div>
        <h1 className="text-[34px] font-medium text-gold-gradient tracking-[0.15em]">吃 過 · 想 吃</h1>
        <div className="mt-4 h-[1px] bg-gradient-to-r from-[#c9a961]/40 via-[#c9a961]/10 to-transparent" />
      </div>

      {location && (
        <div className="px-6 mb-5">
          <div className="flex gap-2">
            {RADIUS_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`text-[13px] tracking-[0.2em] px-4 py-2 ${radius === r ? 'chip chip-active' : 'chip'}`}
              >
                {r >= 1000 ? `${r / 1000}km` : `${r}m`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-28">
        {!location ? (
          <PermissionPrompt loading={loading} error={error} onClick={getLocation} />
        ) : (
          <>
            {/* MEMORY 區塊 — 像翻一本相簿，平靜回顧 */}
            <Section
              title="這附近吃過"
              subtitle="MEMORY · 你的食地足跡"
              count={triedHits.length}
              empty="這附近還沒有你的足跡"
              icon={<BookOpen size={13} className="text-[#8a7544]" />}
            >
              {triedHits.map(({ item, restaurant, dist }) => (
                <MemoryCard
                  key={item.id + restaurant.id}
                  item={item}
                  restaurant={restaurant}
                  dist={dist}
                  thumbnailUrl={imageByFoodId[item.id]}
                  onOpen={onOpen}
                />
              ))}
            </Section>

            <div className="my-8 flex items-center gap-3">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#c9a961]/30 to-transparent" />
              <span className="text-[#c9a961]/50 text-[12px] tracking-[0.5em]">✦</span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-[#c9a961]/30 to-transparent" />
            </div>

            {/* WISHLIST 區塊 — 主動、可行動 */}
            <Section
              title="這附近想吃"
              subtitle="WISHLIST · 現在就能滿足"
              count={wantHits.length}
              empty="想吃清單裡的店家還沒落在這附近"
              icon={<span className="text-[#c9a961] text-[14px]">✦</span>}
            >
              {wantHits.map(({ item, restaurant, dist }) => (
                <WishlistCard
                  key={item.id + restaurant.id}
                  item={item}
                  restaurant={restaurant}
                  dist={dist}
                  thumbnailUrl={imageByFoodId[item.id]}
                  onOpen={onOpen}
                  onMarkTried={() => onMarkTried(item)}
                />
              ))}
            </Section>

            {/* 交給 Google Maps */}
            <div className="mt-10 pt-6 border-t border-[#1f1f1f]">
              <div className="text-[11px] tracking-[0.4em] text-[#555] mb-3">EXPLORE BEYOND</div>
              <button
                onClick={exploreOnGoogleMaps}
                className="w-full bg-[#0f0f0f] border border-[#c9a961]/30 hover:border-[#c9a961]/60 hover:bg-[#c9a961]/5 rounded-[6px] active:scale-[0.99] transition-all py-5 px-5 flex items-center gap-4"
              >
                <Compass size={26} className="text-[#c9a961] flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="text-[15px] text-[#f5f1e8] tracking-wider font-medium">在 Google Maps 找附近更多店</div>
                  <div className="text-[12px] text-[#777] tracking-wider mt-1">想吃新東西時交給 Google</div>
                </div>
                <ExternalLink size={16} className="text-[#666]" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PermissionPrompt({ loading, error, onClick }: {
  loading: boolean; error: string | null; onClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-5">— —</div>
      <p className="text-[#8a8478] text-[14px] tracking-[0.2em] mb-8 max-w-xs leading-relaxed">
        授權位置後，看看這附近<br />和你有關的食物有哪些
      </p>
      <button
        onClick={onClick}
        disabled={loading}
        className="btn-secondary flex items-center gap-2 text-[14px] tracking-[0.3em] px-7 py-3.5"
      >
        <Navigation size={16} />
        {loading ? '定位中' : '取得位置'}
      </button>
      {error && <p className="text-[#6a4444] text-[14px] mt-4">{error}</p>}
    </div>
  );
}

function Section({
  title, subtitle, count, empty, icon, children,
}: {
  title: string; subtitle: string; count: number; empty: string;
  icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-1">
        <div className="flex items-center gap-2.5">
          {icon}
          <h2 className="text-[19px] text-[#f5f1e8] tracking-[0.2em] font-medium">{title}</h2>
          <span className="text-[#c9a961] text-[12px] tracking-widest">{count}</span>
        </div>
      </div>
      <div className="text-[10px] tracking-[0.4em] text-[#666] mb-4">{subtitle}</div>
      {count === 0 ? (
        <p className="text-[#555] text-[13px] tracking-wider italic py-4">{empty}</p>
      ) : (
        <div className="flex flex-col gap-3">{children}</div>
      )}
    </div>
  );
}

// ─── MEMORY 風格：相片冊、平靜、有時間 ───
function MemoryCard({
  item, restaurant, dist, thumbnailUrl, onOpen,
}: {
  item: FoodItem;
  restaurant: Restaurant;
  dist: number;
  thumbnailUrl?: string;
  onOpen: (item: FoodItem) => void;
}) {
  const mapsUrl = googleMapsUrlForRestaurant(restaurant);
  const region = [restaurant.city, restaurant.area].filter(Boolean).join(' ');

  return (
    <div className="bg-[#101010] border border-[#1f1f1f] rounded-[5px] overflow-hidden">
      <button
        onClick={() => onOpen(item)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left active:bg-[#161616]"
      >
        {/* 縮圖（如有）放左邊，像相片角落 */}
        {thumbnailUrl && (
          <div className="flex-shrink-0 w-16 h-16 bg-[#0a0a0a] border border-[#2a2a2a] overflow-hidden grayscale-[15%]">
            <img src={thumbnailUrl} alt="" className="w-full h-full object-cover opacity-90" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {/* 標題：襯線、平淡 */}
          <h3
            className="text-[19px] text-[#d6c89a] leading-tight mb-1.5 tracking-wide"
            style={{ fontFamily: "'Noto Serif TC', serif", fontWeight: 500 }}
          >
            {item.name}
          </h3>
          <div className="flex items-center gap-1.5 text-[#8a8478]">
            <MapPin size={11} className="opacity-70" />
            <span className="text-[12px] tracking-wide">
              {restaurant.name}{region && ` · ${region}`}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-[#8a7544]">
            <span className="text-[11px] tracking-[0.25em] italic">上次：{timeAgo(item.updatedAt)}</span>
            <span className="text-[#3a3a3a]">·</span>
            <span className="text-[11px] tracking-[0.25em]">{fmtDist(dist)}</span>
            {item.rating && (
              <>
                <span className="text-[#3a3a3a]">·</span>
                <span className="text-[#c9a961] tracking-[0.2em] text-[10px]">
                  {'★'.repeat(item.rating)}
                </span>
              </>
            )}
          </div>
        </div>
      </button>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 border-t border-[#1f1f1f] py-2.5 text-[11px] tracking-[0.25em] text-[#666] hover:text-[#c9a961] hover:bg-[#c9a961]/5 transition-colors"
      >
        再去一次
        <ExternalLink size={10} />
      </a>
    </div>
  );
}

// ─── WISHLIST 風格：可行動、亮金、決策感 ───
function WishlistCard({
  item, restaurant, dist, thumbnailUrl, onOpen, onMarkTried,
}: {
  item: FoodItem;
  restaurant: Restaurant;
  dist: number;
  thumbnailUrl?: string;
  onOpen: (item: FoodItem) => void;
  onMarkTried: () => void;
}) {
  const mapsUrl = googleMapsUrlForRestaurant(restaurant);
  const region = [restaurant.city, restaurant.area].filter(Boolean).join(' ');

  return (
    <div className="bg-gradient-to-br from-[#1a1612] to-[#0f0d0a] border border-[#c9a961]/35 hover:border-[#c9a961]/60 rounded-[6px] overflow-hidden shadow-[0_2px_12px_rgba(201,169,97,0.08)] transition-all">
      <button
        onClick={() => onOpen(item)}
        className="w-full flex items-start gap-4 px-5 py-5 text-left active:scale-[0.99]"
      >
        <div className="flex-1 min-w-0">
          {/* 距離放最上方當「可行性」訊號 */}
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={item.status} />
            <span className="ml-auto text-[#c9a961] text-[12px] tracking-[0.3em] font-medium">
              {fmtDist(dist)}
            </span>
          </div>
          <h3 className="text-[24px] text-gold-gradient font-medium tracking-wide leading-tight mb-2">
            {item.name}
          </h3>
          <div className="flex items-center gap-1.5 text-[#8a8478]">
            <MapPin size={12} />
            <span className="text-[13px] tracking-wide">
              {restaurant.name}{region && ` · ${region}`}
            </span>
          </div>
          {restaurant.note && (
            <p className="text-[12px] text-[#c9a961]/70 italic tracking-wide mt-1.5">「{restaurant.note}」</p>
          )}
        </div>

        {thumbnailUrl && (
          <div className="flex-shrink-0 w-20 h-20 bg-[#0a0a0a] border border-[#c9a961]/40 overflow-hidden">
            <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </button>

      {/* 雙動作：去吃 / 已吃 */}
      <div className="grid grid-cols-2 border-t border-[#c9a961]/20">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-3 text-[13px] tracking-[0.25em] text-[#c9a961] hover:bg-[#c9a961]/10 transition-colors border-r border-[#c9a961]/20"
        >
          <Navigation size={13} />
          導航
          <ExternalLink size={10} />
        </a>
        <button
          onClick={(e) => { e.stopPropagation(); onMarkTried(); }}
          className="flex items-center justify-center gap-1.5 py-3 text-[13px] tracking-[0.25em] text-[#c9a961]/80 hover:bg-[#c9a961]/10 hover:text-[#c9a961] transition-colors"
        >
          <Check size={14} />
          今天吃了
        </button>
      </div>
    </div>
  );
}
