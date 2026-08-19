import { useState, useRef } from 'react';
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { CITIES } from '../types';
import { TOWNS_BY_COUNTY } from '../lib/twAreas';
import type { Wish } from '../types';

export interface FulfillInput {
  wish: Wish;
  city?: string;
  area?: string;
  ateAt: string; // ISO
  photoUrl?: string;
  note?: string;
}

interface Props {
  wish: Wish;
  uploadPhoto: (file: File) => Promise<string>;
  onSave: (input: FulfillInput) => Promise<void>;
  onClose: () => void;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 願望實現：填的東西跟「記一筆足跡」幾乎一樣，因為實現本來就會產生一筆足跡。
// 差別是名稱不用填——直接用願望的文字當標題。
export function FulfillWishSheet({ wish, uploadPhoto, onSave, onClose }: Props) {
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [dateStr, setDateStr] = useState<string>(todayIso());
  const [note, setNote] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 海外 / 其他沒有鄉鎮清單，選單就停用
  const towns = TOWNS_BY_COUNTY[city] ?? [];

  const handlePickPhoto = (file: File) => {
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => setLocalPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (pendingFile) photoUrl = await uploadPhoto(pendingFile);

      // 日期被清空或格式不對時退回今天，避免 Invalid Date 讓儲存直接失敗
      const candidate = new Date(`${dateStr}T${new Date().toTimeString().slice(0, 5)}:00`);
      const ateAt = (dateStr && !Number.isNaN(candidate.getTime()) ? candidate : new Date()).toISOString();

      await onSave({
        wish,
        city: city || undefined,
        area: area || undefined,
        ateAt,
        photoUrl,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (e) {
      // 失敗路徑都已在 App 層跳過 toast 並回滾，留在 sheet 讓使用者重試
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[3px] flex items-end justify-center animate-slideup"
      onClick={onClose}
    >
      <div
        className="w-full bg-bg rounded-t-[28px] border-t border-separator"
        style={{ maxWidth: 430, paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-4">
          <div className="min-w-0 flex-1">
            <div className="eyebrow mb-1">WISH COME TRUE</div>
            <h2 className="t-title truncate">{wish.text}</h2>
            <p className="t-caption mt-1">會記成一筆足跡，地點填了就會上地圖</p>
          </div>
          <button onClick={onClose} className="icon-btn flex-shrink-0" aria-label="關閉">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pb-4 space-y-4 max-h-[62vh] overflow-y-auto">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="eyebrow-tc block mb-2">縣市（可略）</label>
              <select
                value={city}
                onChange={e => { setCity(e.target.value); setArea(''); }}
                className="w-full bg-surface border border-separator focus:border-tint rounded-[16px] px-3 py-3 text-[15px] text-text focus:outline-none"
              >
                <option value="">不指定</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="eyebrow-tc block mb-2">鄉鎮區（可略）</label>
              <select
                value={area}
                onChange={e => setArea(e.target.value)}
                disabled={towns.length === 0}
                className="w-full bg-surface border border-separator focus:border-tint rounded-[16px] px-3 py-3 text-[15px] text-text focus:outline-none disabled:opacity-40"
              >
                <option value="">{towns.length ? '不指定' : (city ? '無鄉鎮資料' : '先選縣市')}</option>
                {towns.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="eyebrow-tc block mb-2" htmlFor="fulfill-date">實現的日期</label>
            <input
              id="fulfill-date"
              type="date"
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
              className="w-full bg-surface border border-separator focus:border-tint rounded-[16px] px-3 py-3 text-[15px] text-text focus:outline-none"
            />
          </div>

          <div>
            <label className="eyebrow-tc block mb-2">照片（可略）</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePickPhoto(f); }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-neutral w-full flex items-center justify-center gap-2 py-3 text-[14px]"
            >
              {localPreview ? (
                <img src={localPreview} alt="" className="w-9 h-9 rounded-[10px] object-cover" />
              ) : (
                <ImagePlus size={16} />
              )}
              {localPreview ? '換一張' : '加一張照片'}
            </button>
          </div>

          <div>
            <label className="eyebrow-tc block mb-2" htmlFor="fulfill-note">想說的話（可略）</label>
            <textarea
              id="fulfill-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full bg-surface border border-separator focus:border-tint rounded-[16px] px-4 py-3 text-[15px] text-text focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="px-6 pt-2" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-[15px] disabled:opacity-40"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            記下來
          </button>
        </div>
      </div>
    </div>
  );
}
