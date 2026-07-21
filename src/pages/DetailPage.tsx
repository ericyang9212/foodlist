import { ArrowLeft, Edit3, Trash2, Check, MapPin, ExternalLink } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Thumb } from '../components/Thumb';
import { RestaurantsEditor } from '../components/RestaurantsEditor';
import { safeHttpUrl } from '../lib/url';
import { OCCASION_LABELS } from '../types';
import type { FoodItem, Restaurant } from '../types';

interface Props {
  item: FoodItem;
  thumbnailUrl?: string;
  onClose: () => void;
  onEdit: (item: FoodItem) => void;
  onDelete: (id: string) => void;
  onUpdate: (item: FoodItem) => void;
  onLogFoodprint: (item: FoodItem) => void;
}

export function DetailPage({ item, thumbnailUrl, onClose, onEdit, onDelete, onUpdate, onLogFoodprint }: Props) {
  const handleDelete = () => {
    if (confirm(`確定要刪除「${item.name}」嗎？`)) {
      onDelete(item.id);
      onClose();
    }
  };

  // 店家型項目（restaurants[0] 名字＝標題）：地點顯示在標題下方、其餘是其他分店。
  // 想吃型／舊制項目：restaurants 全部是候選店家，用清單呈現。
  const store = item.restaurants[0];
  const isOwnStore = !!store && store.name === item.name;
  const branches = isOwnStore ? item.restaurants.slice(1) : [];
  const region = isOwnStore ? [store.city, store.area].filter(Boolean).join(' ') : '';
  const storeMap = isOwnStore ? safeHttpUrl(store.googleMapsUrl) : undefined;

  const handleBranchesChange = (next: Restaurant[]) => {
    onUpdate({ ...item, restaurants: isOwnStore ? [store, ...next] : next, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0a08] animate-fadein" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div
        className="flex items-center justify-between px-6 pb-4 border-b border-[#211c15]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button onClick={onClose} className="icon-btn">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(item)} className="icon-btn">
            <Edit3 size={17} />
          </button>
          <button onClick={handleDelete} className="icon-btn hover:!text-[#a85959] hover:!bg-[#a85959]/10">
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        {/* Hero */}
        <div className="mb-7">
          <div className="eyebrow-tc mb-4">想吃的食物</div>
          <div className="flex items-start gap-4 mb-4">
            <h1 className="flex-1 text-[36px] text-gold-gradient tracking-[0.05em] font-medium leading-tight">
              {item.name}
            </h1>
            {thumbnailUrl && (
              <div className="flex-shrink-0 w-24 h-24 rounded-[6px] border border-[#c9a961]/40 overflow-hidden shadow-[0_4px_16px_rgba(201,169,97,0.15)]">
                <Thumb src={thumbnailUrl} className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={item.status} />
            {item.cuisineType && (
              <span className="text-[13px] text-[#7d7566] tracking-widest">{item.cuisineType}</span>
            )}
          </div>

          {/* 這家店的地點（restaurants[0]），不重複店名 */}
          {(region || storeMap) && (
            <div className="flex items-center gap-3 mt-4">
              {region && (
                <span className="flex items-center gap-1.5 text-[14px] text-[#8a8478] tracking-wide">
                  <MapPin size={14} />{region}
                </span>
              )}
              {storeMap && (
                <a
                  href={storeMap}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary flex items-center gap-1.5 text-[12px] tracking-wider px-3 py-1.5"
                >
                  <ExternalLink size={12} />
                  地圖
                </a>
              )}
            </div>
          )}
        </div>

        {item.rating && (
          <div className="text-[#c9a961] tracking-[0.4em] text-xl mb-7">
            {'★'.repeat(item.rating)}<span className="text-[#2c261d]">{'★'.repeat(5 - item.rating)}</span>
          </div>
        )}

        {/* 「今天吃了」/「又吃了一次」主動作 — 開記錄 sheet */}
        {item.status === 'want' && (
          <button
            onClick={() => onLogFoodprint(item)}
            className="btn-primary w-full py-4 mb-7 flex items-center justify-center gap-2 text-[15px] tracking-[0.3em]"
          >
            <Check size={18} strokeWidth={2.5} />
            今天吃了
          </button>
        )}
        {item.status === 'tried' && (
          <button
            onClick={() => onLogFoodprint(item)}
            className="btn-secondary w-full py-3.5 mb-7 flex items-center justify-center gap-2 text-[13px] tracking-[0.3em]"
          >
            <Check size={14} />
            又吃了一次
          </button>
        )}

        {item.occasions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-7">
            {item.occasions.map(o => (
              <span key={o} className="text-[14px] tracking-wider px-3 py-1.5 rounded-full border border-[#c9a961]/30 text-[#c9a961]/90">
                {OCCASION_LABELS[o]}
              </span>
            ))}
          </div>
        )}

        {item.notes && (
          <div className="mb-8">
            <div className="eyebrow-tc mb-3">筆記</div>
            <p className="text-[#d6d0c0] text-[16px] leading-relaxed border-l border-[#c9a961]/30 pl-4">
              {item.notes}
            </p>
          </div>
        )}

        {/* 店家型：主店家已在上方，只列其他分店；想吃型／舊制：整份候選清單（可隨時補店） */}
        {(isOwnStore ? branches.length > 0 : true) && (
          <div className="mt-10 pt-7 border-t border-[#211c15]">
            <RestaurantsEditor
              title={isOwnStore ? '其他分店' : '候選店家'}
              restaurants={isOwnStore ? branches : item.restaurants}
              onChange={handleBranchesChange}
            />
          </div>
        )}

        <div className="text-[12px] tracking-widest text-[#5d574c] border-t border-[#211c15] pt-5 mt-10">
          {new Date(item.createdAt).toLocaleDateString('zh-TW')}
        </div>
      </div>
    </div>
  );
}
