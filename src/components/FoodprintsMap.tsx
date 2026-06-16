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

export function FoodprintsMap({ items }: { items: Foodprint[] }) {
  const { dots, noCoord, overseas } = useMemo(() => {
    const m = new Map<string, Foodprint[]>();
    let noCoord = 0;
    let overseas = 0;
    items.forEach(p => {
      if (typeof p.restaurantLat !== 'number' || typeof p.restaurantLng !== 'number') { noCoord++; return; }
      if (!inTaiwan(p.restaurantLng, p.restaurantLat)) { overseas++; return; }
      const key = `${p.restaurantLat.toFixed(4)},${p.restaurantLng.toFixed(4)}`;
      const arr = m.get(key);
      if (arr) arr.push(p); else m.set(key, [p]);
    });
    const dots = [...m.entries()].map(([key, list]) => {
      const rep = list.reduce((a, b) => (a.ateAt >= b.ateAt ? a : b));
      const [x, y] = project(rep.restaurantLng as number, rep.restaurantLat as number);
      return { key, x, y, rep, count: list.length };
    });
    return { dots, noCoord, overseas };
  }, [items]);

  const [sel, setSel] = useState<string | null>(null);
  const selDot = dots.find(d => d.key === sel) ?? null;

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
                <circle cx={d.x} cy={d.y} r={active ? 20 : 15} fill="#d6b974" stroke="#0b0a08" strokeWidth={4} />
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
              還沒有標上地圖的足跡<br />記錄時店家有位置就會出現在這裡
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-[#666] tracking-wider">
          {[noCoord > 0 ? `${noCoord} 筆沒有位置` : null, overseas > 0 ? `海外/離島 ${overseas}` : null].filter(Boolean).join(' · ') || ' '}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-[#8d877a]">
          <span className="w-2 h-2 rounded-full bg-[#d6b974]" />
          吃過的地方 · {dots.length}
        </span>
      </div>
    </div>
  );
}
