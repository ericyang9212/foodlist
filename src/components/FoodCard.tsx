import { StatusBadge } from './StatusBadge';
import { Thumb } from './Thumb';
import { staleLabel } from '../lib/stale';
import type { FoodItem } from '../types';

interface Props {
  item: FoodItem;
  thumbnailUrl?: string;
  onOpen: (item: FoodItem) => void;
}

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 週前`;
  if (days < 365) return `${Math.floor(days / 30)} 個月前`;
  return `${Math.floor(days / 365)} 年前`;
}

export function FoodCard({ item, thumbnailUrl, onOpen }: Props) {
  // 優先顯示縣市，沒設縣市才退到區域
  const regions = Array.from(new Set(item.restaurants.map(r => r.city || r.area).filter(Boolean)));

  return (
    <div
      onClick={() => onOpen(item)}
      className="group relative card-surface hover:!border-[#c9a961]/40 hover:shadow-[0_6px_20px_rgba(201,169,97,0.1)] rounded-[8px] overflow-hidden transition-all cursor-pointer active:scale-[0.99]"
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
            {item.status === 'tried' && (
              <span className="text-[12px] text-[#8a8478] tracking-wider">
                上次吃 · {timeAgo(item.updatedAt)}
              </span>
            )}
            {item.status === 'want' && staleLabel(item.createdAt) && (
              <span className="text-[12px] text-[#666] tracking-wider">
                躺了 {staleLabel(item.createdAt)}
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
          <div className="relative flex-shrink-0 w-20 h-20 rounded-[6px] bg-[#0a0a0a] border border-[#2a2a2a] overflow-hidden">
            <Thumb src={thumbnailUrl} className="w-full h-full object-cover" />
            <div className="pointer-events-none absolute inset-0 rounded-[6px] ring-1 ring-inset ring-white/5" />
          </div>
        )}
      </div>
    </div>
  );
}
