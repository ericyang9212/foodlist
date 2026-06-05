import { useState, useMemo } from 'react';
import { Navigation, MapPin } from 'lucide-react';
import { FoodCard } from '../components/FoodCard';
import type { FoodItem } from '../types';

interface Props {
  items: FoodItem[];
  onOpen: (item: FoodItem) => void;
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

const RADIUS_OPTIONS = [500, 1000, 2000, 5000];

export function NearbyPage({ items, onOpen }: Props) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(1000);

  const getLocation = () => {
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      () => {
        setError('無法取得位置，請確認瀏覽器授權');
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  // 只看「想吃」的食物，找出附近有候選店家的
  const nearby = useMemo(() => {
    if (!location) return [];
    return items
      .filter(item => item.status === 'want')
      .map(item => {
        const candidatesWithLoc = item.restaurants.filter(r => r.lat && r.lng);
        if (candidatesWithLoc.length === 0) return null;
        const minDist = Math.min(
          ...candidatesWithLoc.map(r => getDistance(location.lat, location.lng, r.lat!, r.lng!))
        );
        if (minDist > radius) return null;
        return { item, dist: minDist };
      })
      .filter((x): x is { item: FoodItem; dist: number } => x !== null)
      .sort((a, b) => a.dist - b.dist);
  }, [items, location, radius]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="px-6 pt-14 pb-5">
        <div className="text-[10px] tracking-[0.5em] text-[#c9a961]/70 mb-2">NEARBY</div>
        <h1 className="text-[28px] font-medium text-gold-gradient tracking-[0.15em]">附 近 能 吃 到</h1>
        <p className="text-[11px] text-[#666] tracking-wider mt-2">想吃的食物，現在哪些在附近</p>
        <div className="mt-3 h-[1px] bg-gradient-to-r from-[#c9a961]/40 via-[#c9a961]/10 to-transparent" />
      </div>

      <div className="px-6 mb-5">
        <div className="flex gap-1.5">
          {RADIUS_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`text-[11px] tracking-[0.2em] px-3 py-1.5 border transition-colors ${
                radius === r
                  ? 'bg-[#c9a961] text-[#0a0a0a] border-[#c9a961]'
                  : 'border-[#2a2a2a] text-[#8a8478]'
              }`}
            >
              {r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-28">
        {!location ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-4">— —</div>
            <p className="text-[#8a8478] text-[12px] tracking-[0.2em] mb-8 max-w-xs leading-relaxed">
              授權位置，看看現在站的地方<br />附近能吃到哪些想吃的食物
            </p>
            <button
              onClick={getLocation}
              disabled={loading}
              className="flex items-center gap-2 text-[12px] tracking-[0.3em] text-[#c9a961] border border-[#c9a961]/50 px-6 py-3 hover:bg-[#c9a961]/10 transition-colors disabled:opacity-50"
            >
              <Navigation size={14} />
              {loading ? '定位中' : '取得位置'}
            </button>
            {error && <p className="text-[#6a4444] text-[12px] mt-4">{error}</p>}
          </div>
        ) : nearby.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[#666] text-[13px] tracking-wider">
              {radius >= 1000 ? `${radius / 1000}km` : `${radius}m`} 內無候選店家
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-[11px] tracking-[0.3em] text-[#8a8478] pb-1">
              {nearby.length} 道食物現在吃得到
            </p>
            {nearby.map(({ item, dist }) => (
              <div key={item.id}>
                <div className="flex items-center gap-1.5 mb-1.5 text-[#c9a961]/80">
                  <MapPin size={10} />
                  <span className="text-[10px] tracking-[0.3em]">
                    {dist < 1000 ? `${Math.round(dist)}M` : `${(dist / 1000).toFixed(1)}KM`}
                  </span>
                </div>
                <FoodCard item={item} onOpen={onOpen} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
