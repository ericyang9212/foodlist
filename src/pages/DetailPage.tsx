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

const EMPTY_REST: Omit<Restaurant, 'id'> = {
  name: '', city: '', area: '', googleMapsUrl: '', note: '',
};

export function DetailPage({ item, thumbnailUrl, onClose, onEdit, onDelete, onUpdate }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDelete = () => {
    if (confirm(`確定要刪除「${item.name}」嗎？`)) {
      onDelete(item.id);
      onClose();
    }
  };

  const saveRestaurant = (r: Restaurant) => {
    const exists = item.restaurants.some(x => x.id === r.id);
    onUpdate({
      ...item,
      restaurants: exists
        ? item.restaurants.map(x => x.id === r.id ? r : x)
        : [...item.restaurants, r],
      updatedAt: new Date().toISOString(),
    });
    setAdding(false);
    setEditingId(null);
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

        {/* 「今天吃了」/「又吃了一次」主動作 */}
        {item.status === 'want' && (
          <button
            onClick={() => onUpdate({ ...item, status: 'tried', updatedAt: new Date().toISOString() })}
            className="btn-primary w-full py-4 mb-7 flex items-center justify-center gap-2 text-[15px] tracking-[0.3em]"
          >
            <Check size={18} strokeWidth={2.5} />
            今天吃了
          </button>
        )}
        {item.status === 'tried' && (
          <button
            onClick={() => onUpdate({ ...item, updatedAt: new Date().toISOString() })}
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
          <div className="flex items-center justify-between mb-5">
            <div className="text-[13px] tracking-[0.4em] text-[#c9a961]/60">
              候選店家 · {item.restaurants.length}
            </div>
            {!adding && !editingId && (
              <button
                onClick={() => setAdding(true)}
                className="btn-secondary flex items-center gap-1.5 text-[13px] tracking-[0.2em] px-3 py-1.5"
              >
                <Plus size={13} />
                新增
              </button>
            )}
          </div>

          {item.restaurants.length === 0 && !adding && (
            <p className="text-[#555] text-[14px] tracking-wider italic">尚未指定店家</p>
          )}

          <div className="space-y-2.5">
            {item.restaurants.map(r =>
              editingId === r.id ? (
                <RestaurantForm
                  key={r.id}
                  initial={r}
                  submitLabel="儲存修改"
                  onSubmit={saveRestaurant}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <RestaurantRow
                  key={r.id}
                  restaurant={r}
                  onEdit={() => { setAdding(false); setEditingId(r.id); }}
                  onRemove={() => removeRestaurant(r.id)}
                />
              )
            )}
          </div>

          {adding && (
            <div className="mt-3">
              <RestaurantForm
                initial={{ id: makeId(), ...EMPTY_REST }}
                submitLabel="加入"
                onSubmit={saveRestaurant}
                onCancel={() => setAdding(false)}
              />
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

// ── 店家顯示列 ──
function RestaurantRow({ restaurant: r, onEdit, onRemove }: {
  restaurant: Restaurant; onEdit: () => void; onRemove: () => void;
}) {
  const region = [r.city, r.area].filter(Boolean).join(' · ');
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-[5px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[17px] text-[#f5f1e8] font-medium tracking-wide">{r.name}</p>
          {(region || r.address) && (
            <div className="flex items-center gap-1.5 mt-2 text-[#8a8478]">
              <MapPin size={13} />
              <span className="text-[14px] tracking-wide">
                {[region, r.address].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
          {r.note && (
            <p className="text-[14px] text-[#c9a961]/70 italic tracking-wide mt-2.5">「{r.note}」</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {r.googleMapsUrl && (
            <a
              href={r.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center gap-1.5 text-[13px] tracking-wider px-3 py-2"
            >
              <ExternalLink size={13} />
              地圖
            </a>
          )}
          <div className="flex gap-0.5">
            <button onClick={onEdit} className="icon-btn !p-1.5">
              <Edit3 size={14} />
            </button>
            <button
              onClick={onRemove}
              className="icon-btn !p-1.5 hover:!text-[#a85959] hover:!bg-[#a85959]/10"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 共用編輯/新增表單 ──
function RestaurantForm({
  initial, submitLabel, onSubmit, onCancel,
}: {
  initial: Restaurant;
  submitLabel: string;
  onSubmit: (r: Restaurant) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [city, setCity] = useState(initial.city ?? '');
  const [area, setArea] = useState(initial.area ?? '');
  const [url, setUrl] = useState(initial.googleMapsUrl ?? '');
  const [note, setNote] = useState(initial.note ?? '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSubmit({
      ...initial,
      name: name.trim(),
      city: city || undefined,
      area: area.trim() || undefined,
      googleMapsUrl: url.trim() || undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="bg-[#0f0f0f] border border-[#c9a961]/30 rounded-[5px] p-5 space-y-3.5">
      <input
        type="text"
        autoFocus
        placeholder="店名"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2.5 text-[16px] text-[#f5f1e8] placeholder-[#555] focus:outline-none"
      />
      <select
        value={city}
        onChange={e => setCity(e.target.value)}
        className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2.5 text-[15px] text-[#f5f1e8] focus:outline-none appearance-none"
      >
        <option value="" className="bg-[#0f0f0f]">縣市</option>
        {CITIES.map(c => <option key={c} value={c} className="bg-[#0f0f0f]">{c}</option>)}
      </select>
      <input
        type="text"
        placeholder="區域（例如：大安區）"
        value={area}
        onChange={e => setArea(e.target.value)}
        className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2.5 text-[15px] text-[#f5f1e8] placeholder-[#555] focus:outline-none"
      />
      <input
        type="url"
        placeholder="Google Maps 連結"
        value={url}
        onChange={e => setUrl(e.target.value)}
        className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2.5 text-[15px] text-[#f5f1e8] placeholder-[#555] focus:outline-none"
      />
      <input
        type="text"
        placeholder="一句話評價（例如：最便宜、最近）"
        value={note}
        onChange={e => setNote(e.target.value)}
        className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/50 pb-2.5 text-[15px] text-[#f5f1e8] placeholder-[#555] focus:outline-none"
      />
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="btn-primary flex-1 py-3 text-[14px] tracking-[0.3em]"
        >
          {submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="btn-neutral px-5 py-3 text-[14px] tracking-[0.3em]"
        >
          取消
        </button>
      </div>
    </div>
  );
}
