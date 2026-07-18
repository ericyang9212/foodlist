import { useState, useRef } from 'react';
import { X, ChevronDown, ImagePlus, Loader2 } from 'lucide-react';
import { STATUS_LABELS, CUISINE_TYPES, OCCASION_LABELS, CITIES } from '../types';
import { RestaurantsEditor } from '../components/RestaurantsEditor';
import { resolveRestaurantLocation } from '../lib/geocode';
import { makeId } from '../lib/id';
import type { FoodItem, Inspiration, Restaurant, Status, Occasion } from '../types';

interface Props {
  item?: FoodItem;
  // 從靈感轉過來時帶這個（圖已上傳，直接附上）
  inspiration?: Inspiration;
  // 編輯既有食物時，帶入它目前的圖片（讓使用者能看到 / 換掉 / 移除）
  initialImageUrl?: string;
  // 新增時想直接上傳一張圖
  onUploadImage?: (file: File) => Promise<string>;
  onSave: (item: FoodItem, attachedImageUrl?: string) => void;
  onClose: () => void;
}

const STATUSES: Status[] = ['want', 'tried', 'skip'];
const OCCASIONS = Object.keys(OCCASION_LABELS) as Occasion[];

// 主欄位可以是「店家」或「想吃的東西」（頂端小切換，預設店家）。
// 店家：底層存成 restaurants[0]（這家店本身），店家頁 / 足跡 / 地圖照常運作。
// 想吃的東西：不建立假店家（避免「壽司」被當成一間店），想到去哪吃再補候選店家。
// 舊資料自動歸類：restaurants[0] 名字＝標題 → 店家型；其餘（含空、多候選）→ 想吃型。
export function AddEditPage({ item, inspiration, initialImageUrl, onUploadImage, onSave, onClose }: Props) {
  const isEdit = !!item;
  const primary = item?.restaurants?.[0];
  // 店家型項目：restaurants[0] 就是標題那家店
  const ownStore = !!(item && primary && primary.name === item.name);

  const [kind, setKind] = useState<'store' | 'craving'>(!item || ownStore ? 'store' : 'craving');
  const [name, setName] = useState(item?.name ?? '');
  const [status, setStatus] = useState<Status>(item?.status ?? 'want');
  const [cuisineType, setCuisineType] = useState(item?.cuisineType ?? '');

  // 這家店的地點（掛在主店家上；只在店家型使用）
  const [city, setCity] = useState(ownStore ? primary?.city ?? '' : '');
  const [area, setArea] = useState(ownStore ? primary?.area ?? '' : '');
  const [url, setUrl] = useState(ownStore ? primary?.googleMapsUrl ?? '' : '');

  // 店家型＝其他分店（restaurants[1..]）；想吃型＝候選店家（整個 restaurants）
  const [extraStores, setExtraStores] = useState<Restaurant[]>(
    ownStore ? item?.restaurants?.slice(1) ?? [] : item?.restaurants ?? []
  );

  const [occasions, setOccasions] = useState<Occasion[]>(item?.occasions ?? []);
  const [notes, setNotes] = useState(item?.notes ?? inspiration?.note ?? '');
  const [rating, setRating] = useState<number | undefined>(item?.rating);

  const [showStores, setShowStores] = useState(
    ownStore ? (item?.restaurants?.length ?? 0) > 1 : (item?.restaurants?.length ?? 0) > 0
  );
  const [showMore, setShowMore] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // 圖片附件：可能來自 inspiration（已上傳）、編輯時的現有圖、或現場上傳
  const [imageUrl, setImageUrl] = useState<string | undefined>(inspiration?.imageUrl ?? initialImageUrl);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePickImage = (file: File) => {
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => setLocalPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageUrl(undefined);
    setLocalPreview(null);
    setPendingFile(null);
  };

  const toggleOccasion = (o: Occasion) => {
    setOccasions(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
  };

  const handleSave = async () => {
    if (!name.trim() || uploading || saving) return;
    setSaving(true);
    const now = new Date().toISOString();

    // 如果有 pending file，先上傳取得 URL
    let finalImage = imageUrl;
    if (pendingFile && onUploadImage) {
      setUploading(true);
      try {
        finalImage = await onUploadImage(pendingFile);
      } catch {
        alert('圖片上傳失敗');
        setUploading(false);
        setSaving(false);
        return;
      }
      setUploading(false);
    }

    // 店家型：主店家沿用既有那筆（改名跟著標題），否則以「店家」名稱建立並定位；
    // 想吃型：不建假店家，restaurants 就是候選清單（候選在自己的表單裡各自定位過）。
    let restaurants: Restaurant[] = extraStores;
    if (kind === 'store') {
      const store: Restaurant = ownStore
        ? { ...primary!, name: name.trim(), city: city || undefined, area: area.trim() || undefined, googleMapsUrl: url.trim() || undefined }
        : { id: makeId(), name: name.trim(), city: city || undefined, area: area.trim() || undefined, googleMapsUrl: url.trim() || undefined };

      // 地點有變（或還沒定位過）才重新地理編碼，避免每次儲存都打 API
      const locChanged =
        !ownStore ||
        (city || '') !== (primary?.city || '') ||
        (area.trim() || '') !== (primary?.area || '') ||
        (url.trim() || '') !== (primary?.googleMapsUrl || '') ||
        primary?.lat == null;
      if (locChanged) {
        try {
          const geo = await resolveRestaurantLocation({
            name: store.name,
            city: store.city,
            area: store.area,
            googleMapsUrl: store.googleMapsUrl,
          });
          if (geo) { store.lat = geo.lat; store.lng = geo.lng; }
          else { store.lat = undefined; store.lng = undefined; }
        } catch {
          // 定位失敗不擋儲存
        }
      }
      restaurants = [store, ...extraStores];
    }

    onSave({
      id: item?.id ?? makeId(),
      name: name.trim(),
      // 表單沒有這幾個欄位，編輯時必須保留原值，否則會被洗掉
      description: item?.description,
      status,
      cuisineType: cuisineType || undefined,
      occasions,
      restaurants,
      mustOrder: item?.mustOrder ?? [],
      notes: notes.trim() || undefined,
      waitTime: item?.waitTime,
      rating: rating as FoodItem['rating'],
      inspirationIds: item?.inspirationIds,
      createdAt: item?.createdAt ?? now,
      updatedAt: now,
    }, finalImage);
    onClose();
  };

  const previewSrc = localPreview ?? imageUrl;
  const busy = uploading || saving;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0a08] animate-fadein" style={{ maxWidth: 430, margin: '0 auto' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 pb-4 border-b border-[#211c15]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button onClick={onClose} className="icon-btn">
          <X size={22} />
        </button>
        <div className="text-[12px] tracking-[0.4em] text-[#c9a961]/80">
          {isEdit ? 'EDIT' : 'WANT TO EAT'}
        </div>
        <button
          onClick={handleSave}
          disabled={!name.trim() || busy}
          className="btn-primary px-5 py-2 text-[13px] tracking-[0.3em] flex items-center gap-1.5"
        >
          {busy && <Loader2 size={13} className="animate-spin" />}
          {saving ? '定位中' : '儲存'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-8 space-y-7">

          {/* 主欄位（店家或想吃的東西）+ 縮圖（右上角） */}
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              {/* 這筆是店家還是想吃的東西？打「壽司」這種就切右邊，不會被當成一間店 */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setKind('store')}
                  className={`text-[12px] tracking-[0.2em] px-3.5 py-1.5 ${kind === 'store' ? 'chip chip-active' : 'chip'}`}
                >
                  店家
                </button>
                <button
                  onClick={() => setKind('craving')}
                  className={`text-[12px] tracking-[0.2em] px-3.5 py-1.5 ${kind === 'craving' ? 'chip chip-active' : 'chip'}`}
                >
                  想吃的東西
                </button>
              </div>
              <input
                type="text"
                autoFocus={!isEdit}
                placeholder={kind === 'store' ? '例如：藏壽司、海底撈' : '例如：壽司、麻辣鍋'}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => {
                  // 注音/拼音選字的 Enter 不算送出
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSave();
                }}
                className="w-full bg-transparent border-b border-[#2c261d] focus:border-[#c9a961]/60 pb-3 text-[26px] text-[#f5f1e8] placeholder-[#3c352a] tracking-wide focus:outline-none transition-colors"
              />
            </div>

            {/* 縮圖區塊 */}
            {previewSrc ? (
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 rounded-[6px] bg-[#0b0a08] border border-[#c9a961]/40 overflow-hidden shadow-[0_4px_12px_rgba(201,169,97,0.15)]">
                  <img src={previewSrc} alt="" className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 bg-[#0b0a08] border border-[#c9a961]/60 w-6 h-6 rounded-full flex items-center justify-center hover:bg-[#c9a961]/20 transition-colors"
                >
                  <X size={12} className="text-[#c9a961]" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-shrink-0 w-20 h-20 rounded-[6px] border border-dashed border-[#c9a961]/40 hover:border-[#c9a961] hover:bg-[#c9a961]/5 flex flex-col items-center justify-center gap-1 transition-all"
              >
                <ImagePlus size={18} className="text-[#c9a961]" />
                <span className="text-[10px] tracking-wider text-[#c9a961]/70">截圖</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handlePickImage(f);
                e.target.value = '';
              }}
            />
          </div>

          {/* 吃什麼（類別）：主要欄位，直接點選 */}
          <div>
            <div className="text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-3">吃什麼（類別）</div>
            <div className="flex flex-wrap gap-2">
              {CUISINE_TYPES.map(c => (
                <button
                  key={c}
                  onClick={() => setCuisineType(cuisineType === c ? '' : c)}
                  className={cuisineType === c
                    ? 'chip chip-active text-[14px] tracking-wider px-3.5 py-1.5'
                    : 'chip text-[14px] tracking-wider px-3.5 py-1.5'}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* 地點（選填）：掛在這家店，餵地圖 / 帶我去。想吃型沒有店，收起。 */}
          {kind === 'store' && (
          <div>
            <div className="text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-3">地點（選填）</div>
            <div className="space-y-3">
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[8px] px-3 py-3 text-base text-[#f5f1e8] focus:outline-none transition-colors"
              >
                <option value="">縣市</option>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="text"
                placeholder="區域（例如：大安區）"
                value={area}
                onChange={e => setArea(e.target.value)}
                className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[8px] px-3 py-3 text-base text-[#f5f1e8] placeholder-[#5d574c] focus:outline-none transition-colors"
              />
              <input
                type="url"
                inputMode="url"
                placeholder="Google 地圖連結"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[8px] px-3 py-3 text-base text-[#f5f1e8] placeholder-[#5d574c] focus:outline-none transition-colors"
              />
            </div>
            <p className="text-[11px] text-[#6d6557] tracking-wider mt-2 leading-relaxed">
              選縣市或貼地圖連結 → 抽到能「帶我去」，也會出現在足跡地圖。
            </p>
          </div>
          )}

          {/* 店家型＝其他分店；想吃型＝候選店家（想到要去哪吃再補） */}
          <div className="pt-1">
            <button
              onClick={() => setShowStores(!showStores)}
              className="flex items-center gap-2 text-[13px] tracking-[0.3em] text-[#7d7566]"
            >
              <ChevronDown size={15} className={`transition-transform ${showStores ? 'rotate-180' : ''}`} />
              {kind === 'store'
                ? (showStores ? '收起其他分店' : '加其他分店（選填）')
                : (showStores ? '收起候選店家' : '加候選店家（選填）')}
            </button>
            {showStores && (
              <div className="mt-4">
                <RestaurantsEditor
                  title={kind === 'store' ? '其他分店' : '候選店家'}
                  restaurants={extraStores}
                  onChange={setExtraStores}
                />
              </div>
            )}
          </div>

          {/* 更多細節 */}
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-2 text-[13px] tracking-[0.3em] text-[#7d7566]"
          >
            <ChevronDown size={15} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
            {showMore ? '收起' : '加更多細節（選填）'}
          </button>

          {showMore && (
            <div className="space-y-7 pt-2 border-t border-[#211c15]">
              {/* 狀態 */}
              <div className="pt-5">
                <label className="block text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-4">心情</label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={status === s ? 'btn-primary py-3 text-[15px] tracking-wider' : 'btn-neutral py-3 text-[15px] tracking-wider'}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 情境 */}
              <div>
                <label className="block text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-4">適合情境</label>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map(o => (
                    <button
                      key={o}
                      onClick={() => toggleOccasion(o)}
                      className={occasions.includes(o) ? 'chip chip-active text-[14px] tracking-wider px-4 py-2' : 'chip text-[14px] tracking-wider px-4 py-2'}
                    >
                      {OCCASION_LABELS[o]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 評分 */}
              {status === 'tried' && (
                <div>
                  <label className="block text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-4">評分</label>
                  <div className="flex gap-2.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setRating(rating === n ? undefined : n)}
                        className={`text-3xl transition-colors ${
                          n <= (rating ?? 0) ? 'text-[#c9a961]' : 'text-[#2c261d]'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 筆記 */}
              <div>
                <label className="block text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-3">筆記</label>
                <textarea
                  placeholder="必點品項、雷點、推薦時段..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-[#171410] border border-[#2c261d] focus:border-[#c9a961]/40 rounded-[8px] px-3 py-3 text-base text-[#f5f1e8] placeholder-[#5d574c] focus:outline-none resize-none leading-relaxed transition-colors"
                />
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
