import { useState } from 'react';
import { MapPin, ExternalLink, Edit3, X, Plus, Loader2 } from 'lucide-react';
import { CITIES } from '../types';
import { resolveRestaurantLocation } from '../lib/geocode';
import { makeId } from '../lib/id';
import { safeHttpUrl } from '../lib/url';
import type { Restaurant } from '../types';

const EMPTY: Omit<Restaurant, 'id'> = { name: '', city: '', area: '', googleMapsUrl: '', note: '' };

interface Props {
  restaurants: Restaurant[];
  onChange: (next: Restaurant[]) => void;
  title?: string; // 區塊標題（新制下這區是「其他分店」，舊資料仍是「候選店家」）
}

// 共用：候選店家的增 / 刪 / 改（含自動定位）。詳情頁與新增頁共用。
export function RestaurantsEditor({ restaurants, onChange, title = '候選店家' }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const save = (r: Restaurant) => {
    const exists = restaurants.some(x => x.id === r.id);
    onChange(exists ? restaurants.map(x => x.id === r.id ? r : x) : [...restaurants, r]);
    setAdding(false);
    setEditingId(null);
  };

  const remove = (id: string) => onChange(restaurants.filter(r => r.id !== id));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="eyebrow-tc">
          {title} · {restaurants.length}
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

      {restaurants.length === 0 && !adding && (
        <p className="text-[#5d574c] text-[14px] tracking-wider italic">尚未指定店家</p>
      )}

      <div className="space-y-2.5">
        {restaurants.map(r =>
          editingId === r.id ? (
            <RestaurantForm
              key={r.id}
              initial={r}
              submitLabel="儲存修改"
              onSubmit={save}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <RestaurantRow
              key={r.id}
              restaurant={r}
              onEdit={() => { setAdding(false); setEditingId(r.id); }}
              onRemove={() => remove(r.id)}
            />
          )
        )}
      </div>

      {adding && (
        <div className="mt-3">
          <RestaurantForm
            initial={{ id: makeId(), ...EMPTY }}
            submitLabel="加入"
            onSubmit={save}
            onCancel={() => setAdding(false)}
          />
        </div>
      )}
    </div>
  );
}

// ── 店家顯示列 ──
function RestaurantRow({ restaurant: r, onEdit, onRemove }: {
  restaurant: Restaurant; onEdit: () => void; onRemove: () => void;
}) {
  const region = [r.city, r.area].filter(Boolean).join(' · ');
  return (
    <div className="card-surface rounded-[8px] p-5">
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
          {r.lat != null && r.lng != null ? (
            <p className="text-[11px] text-[#c9a961]/60 tracking-wider mt-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c9a961]/70" />
              已定位
            </p>
          ) : (
            <p className="text-[11px] text-[#6d6557] tracking-wider mt-2">
              未定位 · 貼 Google Maps 連結可自動取得位置
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {safeHttpUrl(r.googleMapsUrl) && (
            <a
              href={safeHttpUrl(r.googleMapsUrl)}
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

// ── 新增 / 編輯表單（含自動定位）──
function RestaurantForm({ initial, submitLabel, onSubmit, onCancel }: {
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
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    const base: Restaurant = {
      ...initial,
      name: name.trim(),
      city: city || undefined,
      area: area.trim() || undefined,
      googleMapsUrl: url.trim() || undefined,
      note: note.trim() || undefined,
    };

    const locChanged =
      base.googleMapsUrl !== initial.googleMapsUrl ||
      base.city !== initial.city ||
      base.area !== initial.area ||
      base.address !== initial.address ||
      initial.lat == null;

    if (locChanged) {
      try {
        const geo = await resolveRestaurantLocation({
          name: base.name,
          city: base.city,
          area: base.area,
          address: base.address,
          googleMapsUrl: base.googleMapsUrl,
        });
        if (geo) {
          base.lat = geo.lat;
          base.lng = geo.lng;
        }
      } catch {
        // geocode 失敗不擋儲存
      }
    }

    setSaving(false);
    onSubmit(base);
  };

  return (
    <div className="bg-gradient-to-b from-[#151210] to-[#0e0d0b] border border-[#c9a961]/30 rounded-[10px] p-5 space-y-3.5">
      <input
        type="text"
        autoFocus
        placeholder="店名"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full bg-transparent border-b border-[#2c261d] focus:border-[#c9a961]/50 pb-2.5 text-base text-[#f5f1e8] placeholder-[#5d574c] focus:outline-none"
      />
      <select
        value={city}
        onChange={e => setCity(e.target.value)}
        className="w-full bg-transparent border-b border-[#2c261d] focus:border-[#c9a961]/50 pb-2.5 text-base text-[#f5f1e8] focus:outline-none appearance-none"
      >
        <option value="" className="bg-[#100e0b]">縣市</option>
        {CITIES.map(c => <option key={c} value={c} className="bg-[#100e0b]">{c}</option>)}
      </select>
      <input
        type="text"
        placeholder="區域（例如：大安區）"
        value={area}
        onChange={e => setArea(e.target.value)}
        className="w-full bg-transparent border-b border-[#2c261d] focus:border-[#c9a961]/50 pb-2.5 text-base text-[#f5f1e8] placeholder-[#5d574c] focus:outline-none"
      />
      <input
        type="url"
        placeholder="Google Maps 連結"
        value={url}
        onChange={e => setUrl(e.target.value)}
        className="w-full bg-transparent border-b border-[#2c261d] focus:border-[#c9a961]/50 pb-2.5 text-base text-[#f5f1e8] placeholder-[#5d574c] focus:outline-none"
      />
      <input
        type="text"
        placeholder="一句話評價（例如：最便宜、最近）"
        value={note}
        onChange={e => setNote(e.target.value)}
        className="w-full bg-transparent border-b border-[#2c261d] focus:border-[#c9a961]/50 pb-2.5 text-base text-[#f5f1e8] placeholder-[#5d574c] focus:outline-none"
      />
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="btn-primary flex-1 py-3 text-[14px] tracking-[0.3em] flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? '定位中' : submitLabel}
        </button>
        <button onClick={onCancel} className="btn-neutral px-5 py-3 text-[14px] tracking-[0.3em]">
          取消
        </button>
      </div>
    </div>
  );
}
