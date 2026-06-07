import { ArrowLeft, Edit3, Trash2, Check } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { RestaurantsEditor } from '../components/RestaurantsEditor';
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

  const handleRestaurantsChange = (next: Restaurant[]) => {
    onUpdate({ ...item, restaurants: next, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div
        className="flex items-center justify-between px-6 pb-4 border-b border-[#1f1f1f]"
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
          <div className="text-[13px] tracking-[0.5em] text-[#c9a961]/70 mb-4">想吃的食物</div>
          <div className="flex items-start gap-4 mb-4">
            <h1 className="flex-1 text-[36px] text-gold-gradient tracking-[0.05em] font-medium leading-tight">
              {item.name}
            </h1>
            {thumbnailUrl && (
              <div className="flex-shrink-0 w-24 h-24 rounded-[6px] border border-[#c9a961]/40 overflow-hidden shadow-[0_4px_16px_rgba(201,169,97,0.15)]">
                <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={item.status} />
            {item.cuisineType && (
              <span className="text-[13px] text-[#777] tracking-widest">{item.cuisineType}</span>
            )}
          </div>
        </div>

        {item.rating && (
          <div className="text-[#c9a961] tracking-[0.4em] text-xl mb-7">
            {'★'.repeat(item.rating)}<span className="text-[#2a2a2a]">{'★'.repeat(5 - item.rating)}</span>
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
            <div className="text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-3">筆記</div>
            <p className="text-[#d6d0c0] text-[16px] leading-relaxed border-l border-[#c9a961]/30 pl-4">
              {item.notes}
            </p>
          </div>
        )}

        {/* 候選店家 */}
        <div className="mt-10 pt-7 border-t border-[#1f1f1f]">
          <RestaurantsEditor restaurants={item.restaurants} onChange={handleRestaurantsChange} />
        </div>

        <div className="text-[12px] tracking-widest text-[#555] border-t border-[#1f1f1f] pt-5 mt-10">
          {new Date(item.createdAt).toLocaleDateString('zh-TW')}
        </div>
      </div>
    </div>
  );
}
