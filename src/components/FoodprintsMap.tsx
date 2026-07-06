import { useMemo, useState } from 'react';
import type { Foodprint } from '../types';

// 用同一套等距投影畫台灣輪廓與金點，點才會落在正確位置。
const BBOX = { minLng: 119.9, maxLng: 122.05, minLat: 21.85, maxLat: 25.35 };
const VW = 563;
const VH = 1000;

function project(lng: number, lat: number): [number, number] {
  const x = ((lng - BBOX.minLng) / (BBOX.maxLng - BBOX.minLng)) * VW;
  const y = ((BBOX.maxLat - lat) / (BBOX.maxLat - BBOX.minLat)) * VH;
  return [x, y];
}

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

// 台灣本島簡化海岸線（lng, lat），順時針，僅供視覺輪廓
const OUTLINE: [number, number][] = [
  [121.54, 25.30], [121.74, 25.16], [121.93, 25.01], [121.83, 24.85], [121.86, 24.60],
  [121.65, 24.20], [121.62, 23.98], [121.50, 23.30], [121.38, 22.95], [121.18, 22.78],
  [120.92, 22.30], [120.86, 21.92], [120.74, 22.02], [120.45, 22.37], [120.30, 22.55],
  [120.27, 22.62], [120.10, 22.93], [120.10, 23.10], [120.13, 23.40], [120.16, 23.70],
  [120.43, 24.10], [120.57, 24.30], [120.70, 24.48], [120.93, 24.85], [121.05, 25.03],
  [121.41, 25.18],
];
const OUTLINE_PTS = OUTLINE.map(([lng, lat]) => project(lng, lat).map(n => n.toFixed(1)).join(',')).join(' ');

function regionOf(p: Foodprint): string {
  return [p.restaurantCity, p.restaurantArea].filter(Boolean).join(' ');
}

interface Dot {
  key: string;
  x: number;
  y: number;
  rep: Foodprint;
  count: number;
  approx: boolean; // 依縣市概略定位（非精確座標）
}

export function FoodprintsMap({ items }: { items: Foodprint[] }) {
  const { dots, noCoord, overseas } = useMemo(() => {
    const m = new Map<string, { list: Foodprint[]; lng: number; lat: number; approx: boolean }>();
    let noCoord = 0;
    let overseas = 0;
    items.forEach(p => {
      // 1) 有精確座標且落在本島 → 用真實位置
      if (typeof p.restaurantLat === 'number' && typeof p.restaurantLng === 'number') {
        if (inTaiwan(p.restaurantLng, p.restaurantLat)) {
          const key = `p:${p.restaurantLat.toFixed(4)},${p.restaurantLng.toFixed(4)}`;
          const e = m.get(key);
          if (e) e.list.push(p);
          else m.set(key, { list: [p], lng: p.restaurantLng, lat: p.restaurantLat, approx: false });
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
        const lng = c.lng + j.dlng;
        const lat = c.lat + j.dlat;
        if (inTaiwan(lng, lat)) {
          const key = `c:${p.restaurantCity}|${label}`;
          const e = m.get(key);
          if (e) e.list.push(p);
          else m.set(key, { list: [p], lng, lat, approx: true });
        } else {
          overseas++; // 離島縣市（金門/馬祖/澎湖）落在本島範圍外
        }
        return;
      }
      noCoord++;
    });
    const dots: Dot[] = [...m.entries()].map(([key, e]) => {
      const rep = e.list.reduce((a, b) => (a.ateAt >= b.ateAt ? a : b));
      const [x, y] = project(e.lng, e.lat);
      return { key, x, y, rep, count: e.list.length, approx: e.approx };
    });
    return { dots, noCoord, overseas };
  }, [items]);

  const [sel, setSel] = useState<string | null>(null);
  const selDot = dots.find(d => d.key === sel) ?? null;
  const anyApprox = dots.some(d => d.approx);

  return (
    <div>
      {/* 資訊列：點金點後顯示那裡吃了什麼 */}
      <div className="mb-3 min-h-[46px] rounded-[10px] border border-[#1f1f1f] bg-[#0f0e0b] px-4 py-2.5 flex items-center">
        {selDot ? (
          <div className="min-w-0">
            <div className="text-[15px] text-[#f2ecdd] truncate">
              {selDot.rep.foodName}
              {selDot.count > 1 && <span className="text-[12px] text-[#8d877a]"> · 共 {selDot.count} 次</span>}
            </div>
            <div className="text-[12px] text-[#8d877a] truncate">
              {[selDot.rep.restaurantName, regionOf(selDot.rep)].filter(Boolean).join(' · ') || '—'}
              {selDot.approx && <span className="text-[#6f6a5c]"> · 約略位置</span>}
            </div>
          </div>
        ) : (
          <div className="text-[12px] text-[#76705f] tracking-wider">點地圖上的金點，看那裡吃了什麼</div>
        )}
      </div>

      <div
        className="relative rounded-[14px] overflow-hidden border border-[#1f1f1f]"
        style={{ height: '58vh', background: 'radial-gradient(120% 80% at 50% 18%, #14120d 0%, #0b0a08 72%)' }}
      >
        <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
          <polygon
            points={OUTLINE_PTS}
            fill="rgba(201,169,97,0.06)"
            stroke="rgba(201,169,97,0.5)"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {dots.map(d => {
            const active = d.key === sel;
            return (
              <g key={d.key} onClick={() => setSel(d.key)} style={{ cursor: 'pointer' }}>
                <circle cx={d.x} cy={d.y} r={30} fill="transparent" />
                {active && <circle cx={d.x} cy={d.y} r={26} fill="rgba(201,169,97,0.18)" />}
                <circle
                  cx={d.x}
                  cy={d.y}
                  r={active ? 20 : 15}
                  fill={d.approx ? '#b9995a' : '#d6b974'}
                  fillOpacity={d.approx ? 0.85 : 1}
                  stroke="#0b0a08"
                  strokeWidth={4}
                />
                {d.count > 1 && (
                  <text x={d.x} y={d.y + 5} textAnchor="middle" fontSize="15" fontWeight="600" fill="#100d07">{d.count}</text>
                )}
              </g>
            );
          })}
        </svg>

        {dots.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-[13px] text-[#76705f] tracking-wider text-center px-8">
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
          吃過的地方 · {dots.length}
        </span>
      </div>
    </div>
  );
}
