import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import type { Foodprint } from '../types';

const BBOX = { minLng: 119.9, maxLng: 122.05, minLat: 21.85, maxLat: 25.35 };
const TAIWAN_CENTER: L.LatLngTuple = [23.7, 121.0];

function inTaiwan(lng: number, lat: number): boolean {
  return lng >= BBOX.minLng && lng <= BBOX.maxLng && lat >= BBOX.minLat && lat <= BBOX.maxLat;
}

// 各縣市概略中心點：多數足跡沒有精確經緯度（短連結不含座標、店名地理編碼常失敗），
// 但幾乎都有縣市 —— 沒座標時就退回落在縣市大概位置，至少看得到。
const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  '台北市': { lat: 25.037, lng: 121.564 },
  '新北市': { lat: 25.012, lng: 121.465 },
  '基隆市': { lat: 25.128, lng: 121.739 },
  '桃園市': { lat: 24.994, lng: 121.301 },
  '新竹市': { lat: 24.814, lng: 120.968 },
  '新竹縣': { lat: 24.839, lng: 121.018 },
  '苗栗縣': { lat: 24.560, lng: 120.821 },
  '台中市': { lat: 24.148, lng: 120.674 },
  '彰化縣': { lat: 24.052, lng: 120.516 },
  '南投縣': { lat: 23.902, lng: 120.686 },
  '雲林縣': { lat: 23.708, lng: 120.544 },
  '嘉義市': { lat: 23.480, lng: 120.449 },
  '嘉義縣': { lat: 23.452, lng: 120.256 },
  '台南市': { lat: 22.995, lng: 120.213 },
  '高雄市': { lat: 22.627, lng: 120.301 },
  '屏東縣': { lat: 22.552, lng: 120.549 },
  '宜蘭縣': { lat: 24.702, lng: 121.738 },
  '花蓮縣': { lat: 23.987, lng: 121.602 },
  '台東縣': { lat: 22.758, lng: 121.144 },
  '澎湖縣': { lat: 23.571, lng: 119.579 },
  '金門縣': { lat: 24.449, lng: 118.377 },
  '連江縣': { lat: 26.160, lng: 119.951 },
};

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// 依店名做穩定的小位移，讓同縣市的不同店不會完全疊在一起（約 ±4km）
function jitter(seed: string): { dlng: number; dlat: number } {
  const h = hashStr(seed);
  const a = (h & 0xffff) / 0xffff;
  const b = ((h >>> 16) & 0xffff) / 0xffff;
  return { dlng: (a - 0.5) * 0.07, dlat: (b - 0.5) * 0.07 };
}

interface HeatData {
  points: L.HeatLatLngTuple[];
  noCoord: number;
  overseas: number;
  locationCount: number;
  anyApprox: boolean;
}

function buildHeatData(items: Foodprint[]): HeatData {
  const locations = new Set<string>();
  const points: L.HeatLatLngTuple[] = [];
  let noCoord = 0;
  let overseas = 0;
  let approxCount = 0;

  items.forEach(p => {
    // 1) 有精確座標且落在本島 → 用真實位置
    if (typeof p.restaurantLat === 'number' && typeof p.restaurantLng === 'number') {
      if (inTaiwan(p.restaurantLng, p.restaurantLat)) {
        locations.add(`p:${p.restaurantLat.toFixed(4)},${p.restaurantLng.toFixed(4)}`);
        points.push([p.restaurantLat, p.restaurantLng, 1]);
      } else {
        overseas++;
      }
      return;
    }
    // 2) 沒座標但有縣市 → 落在縣市概略位置（同縣市不同店會稍微散開）
    const c = p.restaurantCity ? CITY_CENTROIDS[p.restaurantCity] : undefined;
    if (c) {
      const label = p.restaurantName || p.foodName;
      const j = jitter(`${p.restaurantCity}|${label}`);
      const lat = c.lat + j.dlat;
      const lng = c.lng + j.dlng;
      if (inTaiwan(lng, lat)) {
        locations.add(`c:${p.restaurantCity}|${label}`);
        points.push([lat, lng, 1]);
        approxCount++;
      } else {
        overseas++; // 離島縣市（金門/馬祖/澎湖）落在本島範圍外
      }
      return;
    }
    noCoord++;
  });

  return { points, noCoord, overseas, locationCount: locations.size, anyApprox: approxCount > 0 };
}

// 熱區圖層：去過越多次／越密集的地方顏色越深（金 → 橘 → 深紅），稀疏處淡到透明
function HeatLayer({ points }: { points: L.HeatLatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const layer = L.heatLayer(points, {
      radius: 22,
      blur: 15,
      max: 6, // 同一處累積約 6 次造訪就到最深紅；次數少則偏淡金
      // maxZoom 刻意設得很低：leaflet.heat 預設會依「目前縮放 vs maxZoom」的差距去衰減強度
      // （假設使用者要放大才看得到熱點），但這裡地圖一開始就 fitBounds 到全部資料，
      // 縮放程度本來就偏低，若用預設會被壓到幾乎看不見，所以固定用未衰減的滿強度。
      maxZoom: 1,
      minOpacity: 0.12,
      gradient: {
        0.0: 'rgba(201,169,97,0)',
        0.25: 'rgba(214,185,116,0.6)',
        0.55: '#e08a3c',
        1.0: '#9c2b1f',
      },
    }).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}

// 自動把視野收攏到所有資料點的範圍內，沒資料時退回台灣整體視角
function FitToData({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 13 });
    } else {
      map.setView(TAIWAN_CENTER, 7);
    }
  }, [map, bounds]);

  return null;
}

export function FoodprintsMap({ items }: { items: Foodprint[] }) {
  const { points, noCoord, overseas, locationCount, anyApprox } = useMemo(() => buildHeatData(items), [items]);

  const bounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (points.length === 0) return null;
    return L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
  }, [points]);

  return (
    <div>
      <div
        className="relative rounded-[14px] overflow-hidden border border-[#1f1f1f]"
        style={{ height: 'clamp(340px, 52vh, 480px)' }}
      >
        <MapContainer
          center={TAIWAN_CENTER}
          zoom={7}
          scrollWheelZoom={false}
          style={{ width: '100%', height: '100%', background: '#0b0a08' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <HeatLayer points={points} />
          <FitToData bounds={bounds} />
        </MapContainer>

        {points.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
            <p className="text-[13px] text-[#76705f] tracking-wider text-center px-8 bg-[#0b0a08]/80 py-3 rounded-[10px]">
              還沒有標上地圖的足跡<br />記錄時填了縣市就會出現在這裡
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-[#666] tracking-wider">
          {[
            noCoord > 0 ? `${noCoord} 筆沒有縣市` : null,
            overseas > 0 ? `離島/海外 ${overseas}` : null,
            anyApprox ? '部分依縣市概略定位' : null,
          ].filter(Boolean).join(' · ') || ' '}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#8d877a]">
          <span className="w-2 h-2 rounded-full bg-[#d6b974]" />
          吃過的地方 · {locationCount}
        </span>
      </div>
    </div>
  );
}
