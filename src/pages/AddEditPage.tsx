import { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { STATUS_LABELS, CUISINE_TYPES, OCCASION_LABELS } from '../types';
import type { FoodItem, Inspiration, Status, Occasion } from '../types';

interface Props {
  item?: FoodItem;
  inspiration?: Inspiration;       // 從靈感轉過來時帶這個
  onSave: (item: FoodItem) => void;
  onClose: () => void;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

const STATUSES: Status[] = ['want', 'tried', 'skip'];
const OCCASIONS = Object.keys(OCCASION_LABELS) as Occasion[];

export function AddEditPage({ item, inspiration, onSave, onClose }: Props) {
  const isEdit = !!item;

  const [name, setName] = useState(item?.name ?? '');
  const [status, setStatus] = useState<Status>(item?.status ?? 'want');

  // 進階選項（預設收起）
  const [expanded, setExpanded] = useState(isEdit);
  const [cuisineType, setCuisineType] = useState(item?.cuisineType ?? '');
  const [occasions, setOccasions] = useState<Occasion[]>(item?.occasions ?? []);
  const [notes, setNotes] = useState(item?.notes ?? inspiration?.note ?? '');
  const [rating, setRating] = useState<number | undefined>(item?.rating);

  const toggleOccasion = (o: Occasion) => {
    setOccasions(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    onSave({
      id: item?.id ?? makeId(),
      name: name.trim(),
      description: undefined,
      status,
      cuisineType: cuisineType || undefined,
      occasions,
      restaurants: item?.restaurants ?? [],   // 店家從 detail 頁管理
      mustOrder: item?.mustOrder ?? [],
      notes: notes.trim() || undefined,
      waitTime: undefined,
      rating: rating as FoodItem['rating'],
      createdAt: item?.createdAt ?? now,
      updatedAt: now,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#1f1f1f]">
        <button onClick={onClose} className="p-1">
          <X size={22} className="text-[#8a8478]" />
        </button>
        <div className="text-[12px] tracking-[0.4em] text-[#c9a961]/80">
          {isEdit ? 'EDIT' : 'NEW'}
        </div>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="text-[14px] tracking-[0.3em] text-[#c9a961] disabled:text-[#3a3a3a] transition-colors"
        >
          儲存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-10 space-y-8">

          {/* 從靈感轉過來的話顯示縮圖 */}
          {inspiration?.imageUrl && (
            <div className="flex items-start gap-3 bg-[#0f0d0a] border border-[#c9a961]/30 p-3">
              <img src={inspiration.imageUrl} alt="" className="w-20 h-20 object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0 py-1">
                <div className="text-[11px] tracking-[0.3em] text-[#c9a961]/70 mb-1">FROM INSPIRATION</div>
                <p className="text-[13px] text-[#8a8478] line-clamp-3 leading-snug">
                  {inspiration.note || '從靈感轉成想吃食物'}
                </p>
              </div>
            </div>
          )}

          {/* 唯一必填：食物名稱 */}
          <div>
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
              className="w-full bg-transparent border-b border-[#2a2a2a] focus:border-[#c9a961]/60 pb-3 text-[30px] text-[#f5f1e8] placeholder-[#3a3a3a] tracking-wide focus:outline-none transition-colors"
            />
          </div>

          {/* 進階選項收摺起來 */}
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

              {/* 評分（嘗過才有意義） */}
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
