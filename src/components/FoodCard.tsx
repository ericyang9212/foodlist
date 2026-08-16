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
      className="group relative card-surface rounded-[18px] overflow-hidden cursor-pointer transition-transform duration-200 ease-[var(--ease-out-quint)] active:scale-[0.98]"
    >
      {/* 左緣的狀態色條：想吃＝玫瑰金、嘗過＝香檳金、不好吃＝灰 */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${
          item.status === 'want' ? 'bg-rose' : item.status === 'tried' ? 'bg-gold' : 'bg-fill-strong'
        }`}
      />

      <div className="flex gap-4 pl-6 pr-5 py-5">
        {/* 主內容區 */}
        <div className="flex-1 min-w-0">
          <h3 className="t-title mb-2.5">{item.name}</h3>

          {/* meta */}
          <div className="flex items-center gap-2.5 mb-3 flex-wrap">
            <StatusBadge status={item.status} />
            {item.cuisineType && (
              <span className="text-[13px] text-muted">{item.cuisineType}</span>
            )}
            {item.rating && (
              <span className="text-amber text-[13px]">
                {'★'.repeat(item.rating)}
              </span>
            )}
            {item.status === 'tried' && lastEatenAt && (
              <span className="text-[12px] text-muted">
                上次吃 · {timeAgo(lastEatenAt)}
              </span>
            )}
            {item.status === 'want' && staleLabel(item.createdAt) && (
              <span className="text-[12px] text-muted">
                躺了 {staleLabel(item.createdAt)}
              </span>
            )}
          </div>

          {/* 候選店家 */}
          <div className="t-caption">
            {item.restaurants.length === 0 ? (
              <span>未指定店家</span>
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
          <div className="relative flex-shrink-0 w-[84px] h-[84px] rounded-[16px] bg-fill overflow-hidden">
            <Thumb src={thumbnailUrl} className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}
