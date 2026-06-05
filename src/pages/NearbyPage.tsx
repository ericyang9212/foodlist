import { useState, useMemo } from 'react';
import { Navigation, MapPin } from 'lucide-react';
import { FoodCard } from '../components/FoodCard';
import type { FoodItem, Status } from '../types';

interface Props {
  items: FoodItem[];
  onOpen: (item: FoodItem) => void;
  onStatusChange: (id: string, status: Status) => void;
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

export function NearbyPage({ items, onOpen, onStatusChange }: Props) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(1000);
  const [statusFilter, setStatusFilter] = useState<Status | 'want+unsure'>('want+unsure');

  const getLocation = () => {
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      _err => {
        setError('無法取得位置，請確認瀏覽器授權');
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const nearby = useMemo(() => {
    if (!location) return [];
    return items
      .filter(item => {
        if (statusFilter === 'want+unsure') {
          if (item.status !== 'want' && item.status !== 'unsure') return false;
        } else if (item.status !== statusFilter) {
          return false;
        }
        return item.restaurants.some(r => {
          if (!r.lat || !r.lng) return false;
          return getDistance(location.lat, location.lng, r.lat, r.lng) <= radius;
        });
      })
      .map(item => {
        const minDist = Math.min(
          ...item.restaurants
            .filter(r => r.lat && r.lng)
            .map(r => getDistance(location.lat, location.lng, r.lat!, r.lng!))
        );
        return { item, dist: minDist };
      })
      .sort((a, b) => a.dist - b.dist);
  }, [items, location, radius, statusFilter]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-14 pb-3 bg-[#f8f7f5]">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">附近推薦</h1>
        <p className="text-sm text-gray-500 mb-3">根據目前位置篩選你的收藏</p>

        {/* Radius selector */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
          {RADIUS_OPTIONS.map(r => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                radius === r
                  ? 'bg-gray-900 text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: 'want+unsure' as const, label: '想吃 / 不確定' },
            { value: 'want' as const, label: '想吃' },
            { value: 'revisit' as const, label: '再訪' },
            { value: 'visited' as const, label: '已去過' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
                statusFilter === opt.value
                  ? 'bg-orange-500 text-white border-transparent'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {!location ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">📍</div>
            <h3 className="font-semibold text-gray-800 mb-2">開啟定位</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              授權位置後，系統會顯示你想吃清單中距離最近的店家
            </p>
            <button
              onClick={getLocation}
              disabled={loading}
              className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-medium text-sm active:scale-95 transition-transform disabled:opacity-50"
            >
              <Navigation size={16} />
              {loading ? '定位中...' : '取得我的位置'}
            </button>
            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
          </div>
        ) : nearby.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-500 text-sm mb-4">
              {radius >= 1000 ? `${radius / 1000}km` : `${radius}m`} 內沒有符合的收藏
            </p>
            <button
              onClick={() => setRadius(prev => RADIUS_OPTIONS[Math.min(RADIUS_OPTIONS.indexOf(prev) + 1, RADIUS_OPTIONS.length - 1)])}
              className="text-orange-500 text-sm font-medium"
            >
              擴大搜尋範圍
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-1">
            <p className="text-xs text-gray-400 pb-1">
              {radius >= 1000 ? `${radius / 1000}km` : `${radius}m`} 內找到 {nearby.length} 個品項
            </p>
            {nearby.map(({ item, dist }) => (
              <div key={item.id}>
                <div className="flex items-center gap-1 mb-1">
                  <MapPin size={11} className="text-orange-400" />
                  <span className="text-xs text-orange-500 font-medium">
                    約 {dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`}
                  </span>
                </div>
                <FoodCard item={item} onOpen={onOpen} onStatusChange={onStatusChange} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
