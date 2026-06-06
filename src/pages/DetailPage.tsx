import { useState } from 'react';
import { ArrowLeft, MapPin, ExternalLink, Edit3, Trash2, Plus, X, Check } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { OCCASION_LABELS, CITIES } from '../types';
import type { FoodItem, Restaurant } from '../types';

interface Props {
  item: FoodItem;
  thumbnailUrl?: string;
  onClose: () => void;
  onEdit: (item: FoodItem) => void;
  onDelete: (id: string) => void;
  onUpdate: (item: FoodItem) => void;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export function DetailPage({ item, thumbnailUrl, onClose, onEdit, onDelete, onUpdate }: Props) {
  const [adding, setAdding] = useState(false);
  const [restName, setRestName] = useState('');
  const [restCity, setRestCity] = useState('');
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
      city: restCity || undefined,
      area: restArea.trim() || undefined,
      googleMapsUrl: restUrl.trim() || undefined,
      note: restNote.trim() || undefined,
    };
    onUpdate({
      ...item,
      restaurants: [...item.restaurants, newR],
      updatedAt: new Date().toISOString(),
    });
    setRestName(''); setRestCity(''); setRestArea(''); setRestUrl(''); setRestNote('');
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
      <div
        className="flex items-center justify-between px-6 pb-4 border-b border-[#1f1f1f]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button onClick={onClose} className="p-1">
          <ArrowLeft size={22} className="text-[#8a8478]" />
        </button>
        <div className="flex items-center gap-4">
          <button onClick={() => onEdit(item)} className="p-1">
            <Edit3 size={19} className="text-[#c9a961]/80" />
          </button>
          <button onClick={handleDelete} className="p-1">
            <Trash2 size={19} className="text-[#6a4444]" />
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
              <div className="flex-shrink-0 w-24 h-24 border border-[#c9a961]/40 overflow-hidden">
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

        {/* 「今天吃了」主動作：只在想吃時出現 */}
        {item.status === 'want' && (
          <button
            onClick={() => onUpdate({
              ...item,
              status: 'tried',
              updatedAt: new Date().toISOString(),
            })}
            className="w-full bg-[#c9a961] text-[#0a0a0a] py-4 mb-7 flex items-center justify-center gap-2 text-[15px] tracking-[0.3em] font-medium active:scale-[0.98] transition-transform shadow-[0_0_24px_rgba(201,169,97,0.2)]"
          >
            <Check size={18} strokeWidth={2.5} />
            今天吃了
          </button>
        )}

        {/* 嘗過項目顯示上次更新時間 + 再吃一次入口 */}
        {item.status === 'tried' && (
          <button
            onClick={() => onUpdate({
              ...item,
              updatedAt: new Date().toISOString(),
            })}
            className="w-full bg-[#0f0f0f] border border-[#c9a961]/30 hover:border-[#c9a961]/60 py-3.5 mb-7 flex items-center justify-center gap-2 text-[13px] tracking-[0.3em] text-[#c9a961] active:scale-[0.99] transition-all"
          >
            <Check size={14} />
            又吃了一次
          </button>
        )}

        {item.occasions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-7">
            {item.occasions.map(o => (
              <span key={o} className="text-[14px] tracking-wider px-3 py-1.5 border border-[#c9a961]/30 text-[#c9a961]/90">
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
          <div className="flex items-center justify-between mb-5">
            <div className="text-[13px] tracking-[0.4em] text-[#c9a961]/60">
              候選店家 · {item.restaurants.length}
            </div>
            {!adding && (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-1.5 text-[13px] tracking-[0.2em] text-[#c9a961]"
              >
                <Plus size={15} />
                新增
              </button>
            )}
          </div>

          {item.restaurants.length === 0 && !adding && (
            <p className="text-[#555] text-[14px] tracking-wider italic">尚未指定店家</p>
          )}

          <div className="space-y-2.5">
            {item.restaurants.map(r => (
              <div key={r.id} className="bg-[#161616] border border-[#2a2a2a] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] text-[#f5f1e8] font-medium tracking-wide">{r.name}</p>
                    {(r.city || r.area || r.address) && (
                      <div className="flex items-center gap-1.5 mt-2 text-[#8a8478]">
                        <MapPin size={13} />
                        <span className="text-[14px] tracking-wide">
                          {[r.city, r.area, r.address].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                    )}
                    {r.note && (
                      <p className="text-[14px] text-[#c9a961]/70 italic tracking-wide mt-2.5">「{r.note}」</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {r.googleMapsUrl && (
                      <a
                        href={r.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[13px] tracking-wider text-[#c9a961] border border-[#c9a961]/40 px-3 py-2"
                      >
                        <ExternalLink size={13} />
                        地圖
                      </a>
                    )}
                    <button
                      onClick={() => removeRestaurant(r.id)}
                      className="text-[#555] hover:text-[#6a4444] p-1"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {adding && (
            <div className="mt-3 bg-[#0f0f0f] border border-[#c9a961]/30 p-5 space-y-3.5">
              <input
                type="text"
                autoFocus
                placeholder="店名"
                value={restName}
                onChange={e => setRestName(e.target.value)}
                className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2.5 text-[16px] text-[#f5f1e8] placeholder-[#555] focus:outline-none"
              />
              <select
                value={restCity}
                onChange={e => setRestCity(e.target.value)}
                className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2.5 text-[15px] text-[#f5f1e8] focus:outline-none appearance-none"
                style={{ backgroundImage: 'none' }}
              >
                <option value="" className="bg-[#0f0f0f]">縣市</option>
                {CITIES.map(c => <option key={c} value={c} className="bg-[#0f0f0f]">{c}</option>)}
              </select>
              <input
                type="text"
                placeholder="區域（例如：大安區）"
                value={restArea}
                onChange={e => setRestArea(e.target.value)}
                className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2.5 text-[15px] text-[#f5f1e8] placeholder-[#555] focus:outline-none"
              />
              <input
                type="url"
                placeholder="Google Maps 連結"
                value={restUrl}
                onChange={e => setRestUrl(e.target.value)}
                className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2.5 text-[15px] text-[#f5f1e8] placeholder-[#555] focus:outline-none"
              />
              <input
                type="text"
                placeholder="一句話評價（例如：最便宜、最近）"
                value={restNote}
                onChange={e => setRestNote(e.target.value)}
                className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2.5 text-[15px] text-[#f5f1e8] placeholder-[#555] focus:outline-none"
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={addRestaurant}
                  disabled={!restName.trim()}
                  className="flex-1 bg-[#c9a961] text-[#0a0a0a] py-3 text-[14px] tracking-[0.3em] font-medium disabled:opacity-40"
                >
                  加入
                </button>
                <button
                  onClick={() => { setAdding(false); setRestName(''); setRestArea(''); setRestUrl(''); setRestNote(''); }}
                  className="px-5 border border-[#2a2a2a] text-[#8a8478] py-3 text-[14px] tracking-[0.3em]"
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-[12px] tracking-widest text-[#555] border-t border-[#1f1f1f] pt-5 mt-10">
          {new Date(item.createdAt).toLocaleDateString('zh-TW')}
        </div>
      </div>
    </div>
  );
}
