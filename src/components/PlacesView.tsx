import { useMemo, useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { mapsUrlForRestaurant } from '../lib/maps';
import { Thumb } from './Thumb';
import { EmptyMark } from './EmptyMark';
import { StatusBadge } from './StatusBadge';
import type { FoodItem } from '../types';

interface PlaceGroup {
  key: string;
  name: string;
  region: string;
  mapsUrl: string;
  foods: FoodItem[];
}

interface Props {
  foods: FoodItem[];
  imageByFoodId?: Record<string, string>;
  onOpen: (item: FoodItem) => void;
}

// 以「店家」為單位聚合（同名 + 同縣市），點卡片展開該店的菜色。
export function PlacesView({ foods, imageByFoodId = {}, onOpen }: Props) {
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

  // 預設展開菜色最多的那家，其餘收合 —— 一進來就有內容、也看得出可以點開
  const [open, setOpen] = useState<Set<string>>(() => (groups[0] ? new Set([groups[0].key]) : new Set()));
  const toggle = (k: string) =>
    setOpen(prev => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k); else n.add(k);
      return n;
    });

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <EmptyMark className="mb-4" />
        <p className="text-muted text-[15px]">這裡的食物還沒指定店家</p>
        <p className="text-muted text-[12px] mt-1.5">幫食物加上店家，就會以店家彙整</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g, idx) => {
        const isOpen = open.has(g.key);
        const isTop = idx === 0 && g.foods.length >= 2;
        const initial = g.name.trim().charAt(0) || '·';
        return (
          <div key={g.key} className="card-surface rounded-[18px] overflow-hidden">
            <button
              onClick={() => toggle(g.key)}
              className="w-full flex items-center gap-3.5 px-4 py-4 text-left active:bg-fill transition-colors"
            >
              {/* 店名首字圖章：代表「店」、每家不同，不會像食物照片那樣在多家店間重複 */}
              <div className="w-11 h-11 rounded-[16px] bg-tint-soft flex items-center justify-center flex-shrink-0">
                <span className="text-[19px] font-semibold text-tint">{initial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="t-heading truncate">{g.name}</h3>
                  {isTop && (
                    <span className="flex-shrink-0 text-[11px] font-semibold text-coral bg-coral-soft rounded-full px-2 py-[2px]">最想去</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-muted">
                  <MapPin size={11} className="flex-shrink-0" />
                  <span className="text-[12px] truncate">{g.region || '未填地區'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className="text-[12px] font-medium text-muted bg-fill rounded-full px-2.5 py-1">{g.foods.length} 樣</span>
                <ChevronDown
                  size={18}
                  className={`text-muted transition-transform duration-300 ease-[var(--ease-ios)] ${isOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4">
                <div className="border-t border-separator pt-3 flex flex-col gap-1">
                  {g.foods.map(f => (
                    <button
                      key={f.id}
                      onClick={() => onOpen(f)}
                      className="flex items-center gap-3 px-2 py-2 rounded-[16px] active:bg-fill transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-[14px] overflow-hidden bg-fill flex-shrink-0 flex items-center justify-center">
                        {imageByFoodId[f.id]
                          ? <Thumb src={imageByFoodId[f.id]} className="w-full h-full object-cover" />
                          : <span className="text-muted text-[12px]">—</span>}
                      </div>
                      <span className="flex-1 min-w-0 text-[15px] text-text truncate">{f.name}</span>
                      <StatusBadge status={f.status} />
                    </button>
                  ))}
                </div>
                <a
                  href={g.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 w-full btn-secondary flex items-center justify-center gap-1.5 text-[12px] py-2.5"
                >
                  <MapPin size={13} />
                  在地圖開啟
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
