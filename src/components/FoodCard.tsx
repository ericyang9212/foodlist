import { StatusBadge } from './StatusBadge';
import type { FoodItem } from '../types';

interface Props {
  item: FoodItem;
  thumbnailUrl?: string;
  onOpen: (item: FoodItem) => void;
}

export function FoodCard({ item, thumbnailUrl, onOpen }: Props) {
  // 優先顯示縣市，沒設縣市才退到區域
  const regions = Array.from(new Set(item.restaurants.map(r => r.city || r.area).filter(Boolean)));

  return (
    <div
      onClick={() => onOpen(item)}
      className="group relative bg-[#161616] border border-[#2a2a2a] hover:border-[#c9a961]/40 hover:shadow-[0_4px_16px_rgba(201,169,97,0.08)] rounded-[5px] transition-all cursor-pointer active:scale-[0.99]"
    >
      <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[#c9a961] to-transparent opacity-60" />

      <div className="flex gap-4 px-6 py-5">
        {/* 主內容區 */}
        <div className="flex-1 min-w-0">
          {/* 食物名 */}
          <h3 className="text-[24px] text-gold-gradient font-medium tracking-wide leading-tight mb-3">
            {item.name}
          </h3>

          {/* meta */}
          <div className="flex items-center gap-2.5 mb-3 flex-wrap">
            <StatusBadge status={item.status} />
            {item.cuisineType && (
              <span className="text-[13px] text-[#777] tracking-widest">{item.cuisineType}</span>
            )}
            {item.rating && (
              <span className="text-[#c9a961] tracking-[0.3em] text-[13px]">
                {'★'.repeat(item.rating)}
              </span>
            )}
          </div>

          {/* 候選店家 */}
          <div className="text-[13px] text-[#777] tracking-wider">
            {item.restaurants.length === 0 ? (
              <span className="text-[#555] italic">未指定店家</span>
            ) : (
              <span>
                {item.restaurants.length} 家候選
                {regions.length > 0 && ` · ${regions.slice(0, 3).join(' / ')}`}
              </span>
            )}
          </div>
        </div>

        {/* 縮圖（從靈感來的） */}
        {thumbnailUrl && (
          <div className="flex-shrink-0 w-20 h-20 rounded-[4px] bg-[#0a0a0a] border border-[#2a2a2a] overflow-hidden">
            <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
