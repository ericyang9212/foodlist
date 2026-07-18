import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { makeId } from '../lib/id';
import { parseLatLngFromMapsUrl } from '../lib/geocode';
import { CITIES } from '../types';
import type { FoodItem } from '../types';

interface Props {
  onSave: (item: FoodItem) => Promise<unknown> | void;
  onClose: () => void;
}

// 快速加「吃過的店」：只要名字就能加，直接進「嘗過」，之後抽籤選「回訪」就會出現。
// 不用像待吃清單填一堆細節 —— 補足那些吃過、卻從沒放進清單的店。
export function QuickAddRegularSheet({ onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const now = new Date().toISOString();
    const url = mapsUrl.trim();
    // 店家永遠建立（店家視角 / 縣市篩選 / 記足跡都靠 restaurants[0]）；
    // 連結裡帶座標就順手解析（純字串處理，不打網路）
    const geo = parseLatLngFromMapsUrl(url);
    const item: FoodItem = {
      id: makeId(),
      name: trimmed,
      status: 'tried',
      occasions: [],
      restaurants: [{
        id: makeId(),
        name: trimmed,
        city: city || undefined,
        googleMapsUrl: url || undefined,
        lat: geo?.lat,
        lng: geo?.lng,
      }],
      mustOrder: [],
      createdAt: now,
      updatedAt: now,
    };
    try {
      await onSave(item);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-gradient-to-b from-[#151310] to-[#0d0c0a] border-t border-[#c9a961]/25 rounded-t-[18px] px-6 pt-5 animate-slideup"
        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[17px] text-[#f2ecdd] tracking-wide font-medium">加吃過的店</h2>
          <button onClick={onClose} className="icon-btn">
            <X size={20} />
          </button>
        </div>
        <p className="text-[12px] text-[#8d877a] tracking-wide mb-5">
          只要名字就能加，之後抽籤選「回訪」就會出現
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] tracking-[0.3em] text-[#c9a961]/60 mb-2">名稱</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && canSave) handleSave(); }}
              placeholder="店名或想吃的（例：巷口牛肉麵）"
              className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[10px] px-4 py-3 text-base text-[#f5f1e8] placeholder-[#5d574c] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.3em] text-[#c9a961]/60 mb-2">縣市（可略）</label>
            <select
              value={city}
              onChange={e => setCity(e.target.value)}
              className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[10px] px-4 py-3 text-base text-[#f5f1e8] focus:outline-none"
            >
              <option value="">不指定</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.3em] text-[#c9a961]/60 mb-2">Google 地圖連結（可略）</label>
            <input
              value={mapsUrl}
              onChange={e => setMapsUrl(e.target.value)}
              inputMode="url"
              placeholder="貼上地圖連結，抽到就能「帶我去」"
              className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[10px] px-4 py-3 text-base text-[#f5f1e8] placeholder-[#5d574c] focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!canSave}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-6 text-[15px] tracking-[0.2em] disabled:opacity-40"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          加進「嘗過」
        </button>
      </div>
    </div>
  );
}
