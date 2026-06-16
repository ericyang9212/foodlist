import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { mapsUrlForRestaurant } from '../lib/maps';
import type { FoodItem } from '../types';

interface PlaceGroup {
  key: string;
  name: string;
  region: string;
  mapsUrl: string;
  foods: FoodItem[];
}

// 以「店家」為單位聚合食物：同一家店（同名 + 同縣市）底下列出你想吃的幾道。
export function PlacesView({ foods, onOpen }: { foods: FoodItem[]; onOpen: (item: FoodItem) => void }) {
  const groups = useMemo<PlaceGroup[]>(() => {
    const m = new Map<string, PlaceGroup>();
    foods.forEach(food => {
      food.restaurants.forEach(r => {
        if (!r.name?.trim()) return;
        const key = `${r.name.trim().toLowerCase()}|${r.city ?? ''}`;
        let g = m.get(key);
        if (!g) {
          g = {
            key,
            name: r.name,
            region: [r.city, r.area].filter(Boolean).join(' '),
            mapsUrl: mapsUrlForRestaurant(r),
            foods: [],
          };
          m.set(key, g);
        }
        if (!g.foods.some(f => f.id === food.id)) g.foods.push(food);
      });
    });
    return [...m.values()].sort((a, b) => b.foods.length - a.foods.length);
  }, [foods]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-4">— —</div>
        <p className="text-[#777] text-[15px] tracking-wider">這裡的食物還沒指定店家</p>
        <p className="text-[#555] text-[12px] tracking-widest mt-1.5">幫食物加上店家，就會以店家彙整</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map(g => (
        <div key={g.key} className="card-surface rounded-[8px] overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-[19px] text-[#f5f1e8] font-medium tracking-wide leading-tight truncate">{g.name}</h3>
                <div className="flex items-center gap-1.5 mt-1.5 text-[#8a8478]">
                  <MapPin size={12} className="flex-shrink-0" />
                  <span className="text-[12px] tracking-wide">
                    {g.region || '未填地區'} · 想吃 {g.foods.length} 樣
                  </span>
                </div>
              </div>
              <a
                href={g.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-[12px] tracking-wider px-3 py-1.5 flex-shrink-0"
              >
                地圖
              </a>
            </div>
            <div className="flex flex-wrap gap-2 mt-3.5">
              {g.foods.map(f => (
                <button
                  key={f.id}
                  onClick={() => onOpen(f)}
                  className="chip text-[13px] tracking-wide px-3 py-1.5"
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
