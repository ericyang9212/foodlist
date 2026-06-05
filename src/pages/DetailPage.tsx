import { useState } from 'react';
import { ArrowLeft, MapPin, ExternalLink, Edit3, Trash2, Plus, X } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { OCCASION_LABELS } from '../types';
import type { FoodItem, Restaurant } from '../types';

interface Props {
  item: FoodItem;
  onClose: () => void;
  onEdit: (item: FoodItem) => void;
  onDelete: (id: string) => void;
  onUpdate: (item: FoodItem) => void;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export function DetailPage({ item, onClose, onEdit, onDelete, onUpdate }: Props) {
  const [adding, setAdding] = useState(false);
  const [restName, setRestName] = useState('');
  const [restArea, setRestArea] = useState('');
  const [restUrl, setRestUrl] = useState('');
  const [restNote, setRestNote] = useState('');

  const handleDelete = () => {
    if (confirm(`確定要刪除「${item.name}」嗎？`)) {
      onDelete(item.id);
      onClose();
    }
  };

  const addRestaurant = () => {
    if (!restName.trim()) return;
    const newR: Restaurant = {
      id: makeId(),
      name: restName.trim(),
      area: restArea.trim() || undefined,
      googleMapsUrl: restUrl.trim() || undefined,
      note: restNote.trim() || undefined,
    };
    onUpdate({
      ...item,
      restaurants: [...item.restaurants, newR],
      updatedAt: new Date().toISOString(),
    });
    setRestName(''); setRestArea(''); setRestUrl(''); setRestNote('');
    setAdding(false);
  };

  const removeRestaurant = (id: string) => {
    onUpdate({
      ...item,
      restaurants: item.restaurants.filter(r => r.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f1f1f]">
        <button onClick={onClose} className="p-1">
          <ArrowLeft size={20} className="text-[#8a8478]" />
        </button>
        <div className="flex items-center gap-4">
          <button onClick={() => onEdit(item)} className="p-1">
            <Edit3 size={17} className="text-[#c9a961]/80" />
          </button>
          <button onClick={handleDelete} className="p-1">
            <Trash2 size={17} className="text-[#6a4444]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        {/* Hero：食物主角 */}
        <div className="mb-6">
          <div className="text-[10px] tracking-[0.5em] text-[#c9a961]/70 mb-3">想吃的食物</div>
          <h1 className="text-[32px] text-gold-gradient tracking-[0.05em] font-medium leading-tight mb-3">
            {item.name}
          </h1>
          <div className="flex items-center gap-2">
            <StatusBadge status={item.status} />
            {item.cuisineType && (
              <span className="text-[10px] text-[#666] tracking-widest">{item.cuisineType}</span>
            )}
          </div>
        </div>

        {item.rating && (
          <div className="text-[#c9a961] tracking-[0.4em] text-base mb-6">
            {'★'.repeat(item.rating)}<span className="text-[#2a2a2a]">{'★'.repeat(5 - item.rating)}</span>
          </div>
        )}

        {item.occasions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {item.occasions.map(o => (
              <span key={o} className="text-[11px] tracking-wider px-2.5 py-1 border border-[#c9a961]/30 text-[#c9a961]/90">
                {OCCASION_LABELS[o]}
              </span>
            ))}
          </div>
        )}

        {item.notes && (
          <div className="mb-8">
            <div className="text-[10px] tracking-[0.4em] text-[#c9a961]/60 mb-2">筆記</div>
            <p className="text-[#d6d0c0] text-[14px] leading-relaxed border-l border-[#c9a961]/30 pl-4">
              {item.notes}
            </p>
          </div>
        )}

        {/* 候選店家 */}
        <div className="mt-10 pt-6 border-t border-[#1f1f1f]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] tracking-[0.4em] text-[#c9a961]/60">
              候選店家 · {item.restaurants.length}
            </div>
            {!adding && (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-1 text-[11px] tracking-[0.2em] text-[#c9a961]"
              >
                <Plus size={13} />
                新增
              </button>
            )}
          </div>

          {item.restaurants.length === 0 && !adding && (
            <p className="text-[#444] text-[12px] tracking-wider italic">尚未指定店家</p>
          )}

          <div className="space-y-2">
            {item.restaurants.map(r => (
              <div key={r.id} className="bg-[#161616] border border-[#2a2a2a] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] text-[#f5f1e8] font-medium tracking-wide">{r.name}</p>
                    {(r.area || r.address) && (
                      <div className="flex items-center gap-1.5 mt-1 text-[#8a8478]">
                        <MapPin size={11} />
                        <span className="text-[12px] tracking-wide">
                          {[r.area, r.address].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    )}
                    {r.note && (
                      <p className="text-[12px] text-[#c9a961]/70 italic tracking-wide mt-2">「{r.note}」</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {r.googleMapsUrl && (
                      <a
                        href={r.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[11px] tracking-wider text-[#c9a961] border border-[#c9a961]/40 px-2.5 py-1.5"
                      >
                        <ExternalLink size={11} />
                        地圖
                      </a>
                    )}
                    <button
                      onClick={() => removeRestaurant(r.id)}
                      className="text-[#444] hover:text-[#6a4444] p-1"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 加店家的 inline 表單 */}
          {adding && (
            <div className="mt-3 bg-[#0f0f0f] border border-[#c9a961]/30 p-4 space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="店名"
                value={restName}
                onChange={e => setRestName(e.target.value)}
                className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2 text-[14px] text-[#f5f1e8] placeholder-[#444] focus:outline-none"
              />
              <input
                type="text"
                placeholder="區域（例如：大安區）"
                value={restArea}
                onChange={e => setRestArea(e.target.value)}
                className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2 text-[13px] text-[#f5f1e8] placeholder-[#444] focus:outline-none"
              />
              <input
                type="url"
                placeholder="Google Maps 連結"
                value={restUrl}
                onChange={e => setRestUrl(e.target.value)}
                className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2 text-[13px] text-[#f5f1e8] placeholder-[#444] focus:outline-none"
              />
              <input
                type="text"
                placeholder="一句話評價（例如：最便宜、最近）"
                value={restNote}
                onChange={e => setRestNote(e.target.value)}
                className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2 text-[13px] text-[#f5f1e8] placeholder-[#444] focus:outline-none"
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={addRestaurant}
                  disabled={!restName.trim()}
                  className="flex-1 bg-[#c9a961] text-[#0a0a0a] py-2.5 text-[12px] tracking-[0.3em] font-medium disabled:opacity-40"
                >
                  加入
                </button>
                <button
                  onClick={() => { setAdding(false); setRestName(''); setRestArea(''); setRestUrl(''); setRestNote(''); }}
                  className="px-4 border border-[#2a2a2a] text-[#8a8478] py-2.5 text-[12px] tracking-[0.3em]"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-[10px] tracking-widest text-[#444] border-t border-[#1f1f1f] pt-4 mt-10">
          {new Date(item.createdAt).toLocaleDateString('zh-TW')}
        </div>
      </div>
    </div>
  );
}
