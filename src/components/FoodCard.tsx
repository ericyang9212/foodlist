import { StatusBadge } from './StatusBadge';
import { Thumb } from './Thumb';
import { staleLabel } from '../lib/stale';
import type { FoodItem } from '../types';

interface Props {
  item: FoodItem;
  thumbnailUrl?: string;
  lastEatenAt?: string;
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

export function FoodCard({ item, thumbnailUrl, lastEatenAt, onOpen }: Props) {
  // 優先顯示縣市，沒設縣市才退到區域
  const regions = Array.from(new Set(item.restaurants.map(r => r.city || r.area).filter(Boolean)));

  return (
    <div
      onClick={() => onOpen(item)}
      className="group relative card-surface hover:!border-[#c9a961]/40 hover:shadow-[0_8px_26px_rgba(201,169,97,0.12)] rounded-[14px] overflow-hidden transition-all cursor-pointer active:scale-[0.99]"
    >
      <div className="absolute left-0 top-4 bottom-4 w-[2px] rounded-full bg-gradient-to-b from-[#c9a961] to-transparent opacity-70" />

      <div className="flex gap-4 px-6 py-5">
        {/* 主內容區 */}
        <div className="flex-1 min-w-0">
          {/* 食物名：象牙白為主，收斂金色 */}
          <h3 className="text-[23px] text-[#f2ecdd] font-medium tracking-[0.02em] leading-snug mb-3">
            {item.name}
          </h3>

          {/* meta */}
          <div className="flex items-center gap-2.5 mb-3 flex-wrap">
            <StatusBadge status={item.status} />
            {item.cuisineType && (
              <span className="text-[13px] text-[#8d877a] tracking-wider">{item.cuisineType}</span>
            )}
            {item.rating && (
              <span className="text-[#d9bd7c] tracking-[0.25em] text-[13px]">
                {'★'.repeat(item.rating)}
              </span>
            )}
            {item.status === 'tried' && lastEatenAt && (
              <span className="text-[12px] text-[#8d877a] tracking-wider">
                上次吃 · {timeAgo(lastEatenAt)}
              </span>
            )}
            {item.status === 'want' && staleLabel(item.createdAt) && (
              <span className="text-[12px] text-[#6f5a34] tracking-wider">
                躺了 {staleLabel(item.createdAt)}
              </span>
            )}
          </div>

          {/* 候選店家 */}
          <div className="text-[13px] text-[#76705f] tracking-wider">
            {item.restaurants.length === 0 ? (
              <span className="text-[#5d574c] italic">未指定店家</span>
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
          <div className="relative flex-shrink-0 w-[84px] h-[84px] rounded-[12px] bg-[#0a0a0a] border border-[#c9a961]/20 overflow-hidden">
            <Thumb src={thumbnailUrl} className="w-full h-full object-cover" />
            <div className="pointer-events-none absolute inset-0 rounded-[12px] ring-1 ring-inset ring-white/5" />
          </div>
        )}
      </div>
    </div>
  );
}
