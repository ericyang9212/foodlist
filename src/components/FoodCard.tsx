import { StatusBadge } from './StatusBadge';
import type { FoodItem } from '../types';

interface Props {
  item: FoodItem;
  onOpen: (item: FoodItem) => void;
}

export function FoodCard({ item, onOpen }: Props) {
  const areas = Array.from(new Set(item.restaurants.map(r => r.area).filter(Boolean)));

  return (
    <div
      onClick={() => onOpen(item)}
      className="group relative bg-[#161616] border border-[#2a2a2a] hover:border-[#c9a961]/40 transition-colors cursor-pointer active:scale-[0.99]"
    >
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#c9a961] to-transparent opacity-60" />

      <div className="px-6 py-5">
        {/* 食物名 — 主角 */}
        <h3 className="text-[24px] text-gold-gradient font-medium tracking-wide leading-tight mb-3">
          {item.name}
        </h3>

        {/* meta：心情、類型、評分 */}
        <div className="flex items-center gap-2.5 mb-3">
          <StatusBadge status={item.status} />
          {item.cuisineType && (
            <span className="text-[13px] text-[#777] tracking-widest">{item.cuisineType}</span>
          )}
          {item.rating && (
            <span className="ml-auto text-[#c9a961] tracking-[0.3em] text-[13px]">
              {'★'.repeat(item.rating)}
            </span>
          )}
        </div>

        {/* 候選店家 — 配角，只摘要 */}
        <div className="text-[13px] text-[#777] tracking-wider">
          {item.restaurants.length === 0 ? (
            <span className="text-[#555] italic">未指定店家</span>
          ) : (
            <span>
              {item.restaurants.length} 家候選
              {areas.length > 0 && ` · ${areas.slice(0, 3).join(' / ')}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
