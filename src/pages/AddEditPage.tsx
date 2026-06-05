import { useState, useRef } from 'react';
import { X, ChevronDown, ImagePlus, Loader2 } from 'lucide-react';
import { STATUS_LABELS, CUISINE_TYPES, OCCASION_LABELS } from '../types';
import type { FoodItem, Inspiration, Status, Occasion } from '../types';

interface Props {
  item?: FoodItem;
  // 從靈感轉過來時帶這個（圖已上傳，直接附上）
  inspiration?: Inspiration;
  // 新增時想直接上傳一張圖
  onUploadImage?: (file: File) => Promise<string>;
  onSave: (item: FoodItem, attachedImageUrl?: string) => void;
  onClose: () => void;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

const STATUSES: Status[] = ['want', 'tried', 'skip'];
const OCCASIONS = Object.keys(OCCASION_LABELS) as Occasion[];

export function AddEditPage({ item, inspiration, onUploadImage, onSave, onClose }: Props) {
  const isEdit = !!item;

  const [name, setName] = useState(item?.name ?? '');
  const [status, setStatus] = useState<Status>(item?.status ?? 'want');

  const [expanded, setExpanded] = useState(isEdit);
  const [cuisineType, setCuisineType] = useState(item?.cuisineType ?? '');
  const [occasions, setOccasions] = useState<Occasion[]>(item?.occasions ?? []);
  const [notes, setNotes] = useState(item?.notes ?? inspiration?.note ?? '');
  const [rating, setRating] = useState<number | undefined>(item?.rating);

  // 圖片附件：可能來自 inspiration（已上傳）或現場上傳
  const [imageUrl, setImageUrl] = useState<string | undefined>(inspiration?.imageUrl);
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
    if (!name.trim()) return;
    const now = new Date().toISOString();

    // 如果有 pending file，先上傳取得 URL
    let finalImage = imageUrl;
    if (pendingFile && onUploadImage) {
      setUploading(true);
      try {
        finalImage = await onUploadImage(pendingFile);
      } catch (e) {
        alert('圖片上傳失敗');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    onSave({
      id: item?.id ?? makeId(),
      name: name.trim(),
      description: undefined,
      status,
      cuisineType: cuisineType || undefined,
      occasions,
      restaurants: item?.restaurants ?? [],
      mustOrder: item?.mustOrder ?? [],
      notes: notes.trim() || undefined,
      waitTime: undefined,
      rating: rating as FoodItem['rating'],
      createdAt: item?.createdAt ?? now,
      updatedAt: now,
    }, finalImage);
    onClose();
  };

  const previewSrc = localPreview ?? imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]" style={{ maxWidth: 430, margin: '0 auto' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 pb-4 border-b border-[#1f1f1f]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button onClick={onClose} className="p-1">
          <X size={22} className="text-[#8a8478]" />
        </button>
        <div className="text-[12px] tracking-[0.4em] text-[#c9a961]/80">
          {isEdit ? 'EDIT' : 'WANT TO EAT'}
        </div>
        <button
          onClick={handleSave}
          disabled={!name.trim() || uploading}
          className="text-[14px] tracking-[0.3em] text-[#c9a961] disabled:text-[#3a3a3a] transition-colors flex items-center gap-1"
        >
          {uploading && <Loader2 size={13} className="animate-spin" />}
          儲存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-8 space-y-7">

          {/* 食物名稱（主角）+ 縮圖（右上角） */}
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-4">
                {isEdit ? '食物' : '想吃什麼？'}
              </div>
              <input
                type="text"
                autoFocus={!isEdit}
                placeholder="例如：炙燒鮭魚丼"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/60 pb-3 text-[26px] text-[#f5f1e8] placeholder-[#3a3a3a] tracking-wide focus:outline-none transition-colors"
              />
            </div>

            {/* 縮圖區塊 */}
            {previewSrc ? (
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 bg-[#0a0a0a] border border-[#c9a961]/40 overflow-hidden">
                  <img src={previewSrc} alt="" className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 bg-[#0a0a0a] border border-[#c9a961]/60 w-5 h-5 rounded-full flex items-center justify-center"
                >
                  <X size={11} className="text-[#c9a961]" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex-shrink-0 w-20 h-20 border border-dashed border-[#c9a961]/40 hover:border-[#c9a961] flex flex-col items-center justify-center gap-1 transition-colors"
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

          {/* 進階收起 */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-[13px] tracking-[0.3em] text-[#777]"
          >
            <ChevronDown size={15} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? '收起' : '加上更多細節（選填）'}
          </button>

          {expanded && (
            <div className="space-y-7 pt-2 border-t border-[#1f1f1f]">
              {/* 狀態 */}
              <div className="pt-5">
                <label className="block text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-4">心情</label>
                <div className="grid grid-cols-3 gap-2">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`text-[15px] tracking-wider py-3 border transition-all ${
                        status === s
                          ? 'bg-[#c9a961] text-[#0a0a0a] border-[#c9a961] font-medium'
                          : 'border-[#2a2a2a] text-[#777]'
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 類型 */}
              <div>
                <label className="block text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-3">料理類型</label>
                <select
                  value={cuisineType}
                  onChange={e => setCuisineType(e.target.value)}
                  className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-[#c9a961]/40 px-3 py-3 text-[15px] text-[#f5f1e8] focus:outline-none"
                >
                  <option value="">—</option>
                  {CUISINE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* 情境 */}
              <div>
                <label className="block text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-4">適合情境</label>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map(o => (
                    <button
                      key={o}
                      onClick={() => toggleOccasion(o)}
                      className={`text-[14px] tracking-wider px-3.5 py-2 border transition-colors ${
                        occasions.includes(o)
                          ? 'bg-[#c9a961]/15 text-[#c9a961] border-[#c9a961]/40'
                          : 'border-[#2a2a2a] text-[#777]'
                      }`}
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
                          n <= (rating ?? 0) ? 'text-[#c9a961]' : 'text-[#2a2a2a]'
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
                  className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-[#c9a961]/40 px-3 py-3 text-[15px] text-[#f5f1e8] placeholder-[#555] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="text-[13px] tracking-wider text-[#666] leading-relaxed border-t border-[#1f1f1f] pt-5">
                候選店家在儲存後從詳情頁加。
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
