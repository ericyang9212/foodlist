import { useState, useRef } from 'react';
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { CITIES } from '../types';

export interface QuickLogInput {
  name: string;
  city?: string;
  mapsUrl?: string;
  ateAt: string; // ISO
  photoUrl?: string;
  note?: string;
}

interface Props {
  uploadPhoto: (file: File) => Promise<string>;
  onSave: (input: QuickLogInput) => Promise<void>;
  onClose: () => void;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 足跡頁的「記一筆」：清單沒有的店也能直接記——會一併建立「嘗過」項目＋足跡，
// 之後回訪抽籤、店家視角、足跡地圖全都吃得到。
export function QuickLogSheet({ uploadPhoto, onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [dateStr, setDateStr] = useState<string>(todayIso());
  const [note, setNote] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSave = name.trim().length > 0 && !saving;

  const handlePickPhoto = (file: File) => {
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => setLocalPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (pendingFile) photoUrl = await uploadPhoto(pendingFile);

      // 日期欄被清空或格式不對時退回今天，避免 Invalid Date 讓儲存直接失敗
      const candidate = new Date(`${dateStr}T${new Date().toTimeString().slice(0, 5)}:00`);
      const ateAt = (dateStr && !Number.isNaN(candidate.getTime()) ? candidate : new Date()).toISOString();

      await onSave({
        name: name.trim(),
        city: city || undefined,
        mapsUrl: mapsUrl.trim() || undefined,
        ateAt,
        photoUrl,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (e) {
      // 各失敗路徑都已在 store / App 層跳過 toast，留在 sheet 讓使用者重試
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center animate-slideup"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-gradient-to-b from-[#151310] to-[#0d0c0a] border-t border-[#c9a961]/25 rounded-t-[18px]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="text-[17px] text-[#f2ecdd] tracking-wide font-medium">記一筆足跡</h2>
            <p className="text-[12px] text-[#8d877a] tracking-wide mt-1">
              清單沒有的店也能記，會一併加進「嘗過」
            </p>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="關閉">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pb-4 space-y-4 max-h-[62vh] overflow-y-auto">
          <div>
            <label className="block text-[11px] tracking-[0.3em] text-[#c9a961]/60 mb-2">吃了什麼 / 哪間店</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && canSave) handleSave(); }}
              placeholder="例：後院早午餐、精誠夜市"
              className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[10px] px-4 py-3 text-[15px] text-[#f5f1e8] placeholder-[#837b6e] focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[11px] tracking-[0.3em] text-[#c9a961]/60 mb-2">縣市（可略）</label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[10px] px-3 py-3 text-[15px] text-[#f5f1e8] focus:outline-none"
              >
                <option value="">不指定</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[11px] tracking-[0.3em] text-[#c9a961]/60 mb-2">吃的日期</label>
              <input
                type="date"
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[10px] px-3 py-3 text-[15px] text-[#f5f1e8] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.3em] text-[#c9a961]/60 mb-2">Google 地圖連結（可略）</label>
            <input
              value={mapsUrl}
              onChange={e => setMapsUrl(e.target.value)}
              inputMode="url"
              placeholder="貼上連結，之後回訪能「帶我去」"
              className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[10px] px-4 py-3 text-[14px] text-[#f5f1e8] placeholder-[#837b6e] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.3em] text-[#c9a961]/60 mb-2">照片（選填）</label>
            {localPreview ? (
              <div className="relative inline-block">
                <img src={localPreview} alt="" className="max-w-full max-h-40 rounded-[8px] border border-[#c9a961]/30" />
                <button
                  aria-label="移除照片"
                  onClick={() => { setPendingFile(null); setLocalPreview(null); }}
                  className="absolute -top-2 -right-2 bg-[#0b0a08] border border-[#c9a961]/60 w-6 h-6 rounded-full flex items-center justify-center"
                >
                  <X size={12} className="text-[#c9a961]" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border border-dashed border-[#c9a961]/40 hover:border-[#c9a961] hover:bg-[#c9a961]/5 bg-[#0f0d0a] rounded-[8px] py-4 flex items-center justify-center gap-2 transition-all"
              >
                <ImagePlus size={17} className="text-[#c9a961]" />
                <span className="text-[12px] tracking-wider text-[#c9a961]/80">加一張照片</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handlePickPhoto(f);
                e.target.value = '';
              }}
            />
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.3em] text-[#c9a961]/60 mb-2">一句話感想（選填）</label>
            <textarea
              placeholder="例如：比想像中好吃、下次帶爸媽來"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[8px] px-3 py-2.5 text-[14px] text-[#f5f1e8] placeholder-[#837b6e] focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>

        <div className="px-6 pt-2" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-[15px] tracking-[0.2em] disabled:opacity-40"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            記下來
          </button>
        </div>
      </div>
    </div>
  );
}
