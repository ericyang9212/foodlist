import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Foodprint } from '../types';
import { CITY_CENTROIDS, inTaiwan, jitter } from '../lib/foodprintGeo';

// leaflet.heat 是舊式的「全域腳本」寫法：直接讀取全域變數 L 來掛上 L.heatLayer，
// 不是 ESM/CJS 模組。用靜態 import 在正式建置（Rollup）會被當成獨立作用域執行，
// 抓不到我們 `import * as L` 進來的物件，會丟出 "L is not defined" 讓整個地圖元件連帶
// 讓外層的 lazy() 崩潰。改成先把 L 塞進 window，再動態載入這個 plugin 才能穩定運作。
let heatPluginLoaded: Promise<void> | null = null;
function loadHeatPlugin(): Promise<void> {
  if (!heatPluginLoaded) {
    (window as unknown as { L: typeof L }).L = L;
    heatPluginLoaded = import('leaflet.heat').then(() => undefined);
  }
  return heatPluginLoaded;
}

const TAIWAN_CENTER: L.LatLngTuple = [23.7, 121.0];

export interface FlyTarget {
  lat: number;
  lng: number;
  label: string;
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
// radius/blur 刻意壓小：太大會讓幾個點糊成一整片色塊，看起來像氣象圖而不是「幾個熱點」
function HeatLayer({ points }: { points: L.HeatLatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    let layer: L.HeatLayer | undefined;
    let cancelled = false;
    loadHeatPlugin().then(() => {
      if (cancelled) return;
      layer = L.heatLayer(points, {
        radius: 17,
        blur: 13,
        max: 6, // 同一處累積約 6 次造訪就到最深紅；次數少則偏淡金
        // maxZoom 刻意設得很低：leaflet.heat 預設會依「目前縮放 vs maxZoom」的差距去衰減強度
        // （假設使用者要放大才看得到熱點），但這裡地圖一開始就 fitBounds 到全部資料，
        // 縮放程度本來就偏低，若用預設會被壓到幾乎看不見，所以固定用未衰減的滿強度。
        maxZoom: 1,
        minOpacity: 0.35,
        gradient: {
          0.0: 'rgba(201,169,97,0)',
          0.25: 'rgba(214,185,116,0.6)',
          0.55: '#e08a3c',
          1.0: '#9c2b1f',
        },
      }).addTo(map);
    });
    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}

// 在每個資料點上疊一顆小圓點，讓使用者看得出這些是實際地點，不是模糊雲團
function PointDots({ points }: { points: L.HeatLatLngTuple[] }) {
  return (
    <>
      {points.map(([lat, lng], i) => (
        <CircleMarker
          key={i}
          center={[lat, lng]}
          radius={5}
          pathOptions={{
            color: '#f4e8cf',
            weight: 1,
            opacity: 0.6,
            fillColor: '#f4e8cf',
            fillOpacity: 0.55,
          }}
        />
      ))}
    </>
  );
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

// 時間軸點擊某家店時，讓地圖飛過去並彈出店名 popup
function FlyToHandler({ target }: { target: FlyTarget | null }) {
  const map = useMap();
  const targetKey = target ? `${target.lat},${target.lng},${target.label}` : null;

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 14), { duration: 0.8 });

    // 用 DOM 節點 + textContent 塞內容，避免店名裡的字元被當成 HTML 解析
    const content = document.createElement('div');
    content.style.cssText = 'font-size:13px;font-weight:600;color:#2a2116;letter-spacing:0.02em;';
    content.textContent = target.label;

    const popup = L.popup({ closeButton: true, offset: [0, -6] })
      .setLatLng([target.lat, target.lng])
      .setContent(content)
      .openOn(map);

    return () => {
      map.closePopup(popup);
    };
    // targetKey 已經涵蓋 target 內容變化，避免每次重新建立物件觸發多餘的 flyTo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, targetKey]);

  return null;
}

export function FoodprintsMap({ items, flyTarget = null }: { items: Foodprint[]; flyTarget?: FlyTarget | null }) {
  const { points } = useMemo(() => buildHeatData(items), [items]);

  const bounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    if (points.length === 0) return null;
    return L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
  }, [points]);

  // 點太少時熱力圖會整片糊成一坨，改直接顯示一般定位點就好
  const useHeat = points.length >= 3;

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={TAIWAN_CENTER}
        zoom={7}
        scrollWheelZoom
        style={{ width: '100%', height: '100%', background: '#0b0a08' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {useHeat && <HeatLayer points={points} />}
        <PointDots points={points} />
        <FitToData bounds={bounds} />
        <FlyToHandler target={flyTarget} />
      </MapContainer>

      {points.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
          <p className="text-[13px] text-[#76705f] tracking-wider text-center px-8 bg-[#0b0a08]/80 py-3 rounded-[10px]">
            還沒有標上地圖的足跡<br />記錄時填了縣市就會出現在這裡
          </p>
        </div>
      )}
    </div>
  );
}
