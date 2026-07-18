import { useState, useRef } from 'react';
import { X, ImagePlus, Check, Loader2, MapPin } from 'lucide-react';
import type { FoodItem, Restaurant, Foodprint } from '../types';

interface Props {
  food: FoodItem;
  uploadPhoto: (file: File) => Promise<string>;
  onSave: (p: Omit<Foodprint, 'id' | 'createdAt'>) => Promise<void>;
  onClose: () => void;
}

function todayIso() {
  // YYYY-MM-DD for date input
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function LogFoodprintSheet({ food, uploadPhoto, onSave, onClose }: Props) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(
    food.restaurants[0] ?? null
  );
  const [dateStr, setDateStr] = useState<string>(todayIso());
  const [note, setNote] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePickPhoto = (file: File) => {
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => setLocalPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (pendingFile) photoUrl = await uploadPhoto(pendingFile);

      // 日期欄被清空或格式不對時退回今天，避免 Invalid Date 讓儲存直接失敗
      const candidate = new Date(`${dateStr}T${new Date().toTimeString().slice(0, 5)}:00`);
      const ateAtIso = (dateStr && !Number.isNaN(candidate.getTime()) ? candidate : new Date()).toISOString();

      await onSave({
        foodId: food.id,
        foodName: food.name,
        cuisineType: food.cuisineType,
        restaurantName: restaurant?.name,
        restaurantCity: restaurant?.city,
        restaurantArea: restaurant?.area,
        restaurantAddress: restaurant?.address,
        restaurantLat: restaurant?.lat,
        restaurantLng: restaurant?.lng,
        restaurantMapsUrl: restaurant?.googleMapsUrl,
        ateAt: ateAtIso,
        photoUrl,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (e) {
      // 照片上傳 / 足跡寫入失敗都已在 store 層跳過 toast，這裡只要留在 sheet 讓使用者重試
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-slideup"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-gradient-to-b from-[#151210] to-[#0d0c0a] border-t sm:border border-[#c9a961]/30 rounded-t-[16px] sm:rounded-[14px]"
        onClick={e => e.stopPropagation()}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* 抽屜把手 */}
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="w-9 h-1 rounded-full bg-[#3c352a]" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#211c15]">
          <button onClick={onClose} className="icon-btn">
            <X size={20} />
          </button>
          <div className="text-[12px] tracking-[0.4em] text-[#c9a961]/80">RECORD</div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-5 py-2 text-[13px] tracking-[0.3em] flex items-center gap-1.5"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            完成
          </button>
        </div>

        <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* 吃了什麼（read-only） */}
          <div>
            <div className="text-[11px] tracking-[0.4em] text-[#c9a961]/60 mb-2">吃了什麼</div>
            <h3 className="text-[22px] text-gold-gradient font-medium tracking-wide leading-tight">
              {food.name}
            </h3>
          </div>

          {/* 在哪家店 */}
          {food.restaurants.length > 0 ? (
            <div>
              <div className="text-[11px] tracking-[0.4em] text-[#c9a961]/60 mb-2">在哪家店</div>
              {food.restaurants.length === 1 ? (
                <p className="text-[15px] text-[#f5f1e8] flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#8a8478]" />
                  {restaurant?.name}
                  {restaurant?.city && <span className="text-[#8a8478] text-[13px]">· {[restaurant.city, restaurant.area].filter(Boolean).join(' ')}</span>}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {food.restaurants.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setRestaurant(r)}
                      className={`w-full text-left px-3 py-2.5 rounded-[4px] border transition-colors ${
                        restaurant?.id === r.id
                          ? 'bg-[#c9a961]/10 border-[#c9a961]/60'
                          : 'bg-[#171410] border-[#2c261d] hover:border-[#c9a961]/30'
                      }`}
                    >
                      <div className="text-[14px] text-[#f5f1e8]">{r.name}</div>
                      {(r.city || r.area) && (
                        <div className="text-[12px] text-[#8a8478] mt-0.5">{[r.city, r.area].filter(Boolean).join(' ')}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[12px] text-[#6d6557] tracking-wider italic">
              這道食物還沒指定店家，足跡會少了店名資訊。
            </div>
          )}

          {/* 日期 */}
          <div>
            <div className="text-[11px] tracking-[0.4em] text-[#c9a961]/60 mb-2">日期</div>
            <input
              type="date"
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
              className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[8px] px-3 py-2.5 text-base text-[#f5f1e8] focus:outline-none"
            />
          </div>

          {/* 照片（選填） */}
          <div>
            <div className="text-[11px] tracking-[0.4em] text-[#c9a961]/60 mb-2">照片（選填）</div>
            {localPreview ? (
              <div className="relative inline-block">
                <img
                  src={localPreview}
                  alt=""
                  className="max-w-full max-h-48 rounded-[8px] border border-[#c9a961]/30"
                />
                <button
                  onClick={() => { setPendingFile(null); setLocalPreview(null); }}
                  className="absolute -top-2 -right-2 bg-[#0b0a08] border border-[#c9a961]/60 w-6 h-6 rounded-full flex items-center justify-center"
                >
                  <X size={12} className="text-[#c9a961]" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border border-dashed border-[#c9a961]/40 hover:border-[#c9a961] hover:bg-[#c9a961]/5 bg-[#0f0d0a] rounded-[8px] py-5 flex flex-col items-center justify-center gap-1.5 transition-all"
              >
                <ImagePlus size={20} className="text-[#c9a961]" />
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

          {/* 感想（選填） */}
          <div>
            <div className="text-[11px] tracking-[0.4em] text-[#c9a961]/60 mb-2">一句話感想（選填）</div>
            <textarea
              placeholder="例如：第一次吃這家、意外地比想像中清爽"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[8px] px-3 py-2.5 text-base text-[#f5f1e8] placeholder-[#5d574c] focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>

        <div className="px-6 py-3 border-t border-[#211c15] text-center text-[11px] tracking-widest text-[#5d574c]">
          <Check size={12} className="inline mr-1" />
          按完成後加入你的食物足跡
        </div>
      </div>
    </div>
  );
}
