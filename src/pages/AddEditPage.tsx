import { useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { STATUS_LABELS, CUISINE_TYPES, OCCASION_LABELS } from '../types';
import type { FoodItem, Status, Occasion } from '../types';

interface Props {
  item?: FoodItem;
  onSave: (item: FoodItem) => void;
  onClose: () => void;
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

const STATUSES: Status[] = ['want', 'tried', 'skip'];
const OCCASIONS = Object.keys(OCCASION_LABELS) as Occasion[];

export function AddEditPage({ item, onSave, onClose }: Props) {
  const isEdit = !!item;

  const [name, setName] = useState(item?.name ?? '');
  const [status, setStatus] = useState<Status>(item?.status ?? 'want');

  // 進階選項（預設收起）
  const [expanded, setExpanded] = useState(isEdit);
  const [cuisineType, setCuisineType] = useState(item?.cuisineType ?? '');
  const [occasions, setOccasions] = useState<Occasion[]>(item?.occasions ?? []);
  const [notes, setNotes] = useState(item?.notes ?? '');
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
          <X size={20} className="text-[#8a8478]" />
        </button>
        <div className="text-[10px] tracking-[0.4em] text-[#c9a961]/80">
          {isEdit ? 'EDIT' : 'NEW'}
        </div>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="text-[12px] tracking-[0.3em] text-[#c9a961] disabled:text-[#3a3a3a] transition-colors"
        >
          儲存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-10 space-y-8">

          {/* 唯一必填：食物名稱 */}
          <div>
            <div className="text-[10px] tracking-[0.4em] text-[#c9a961]/60 mb-3">
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

          {/* 進階選項收摺起來 */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-[11px] tracking-[0.3em] text-[#666]"
          >
            <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? '收起' : '加上更多細節（選填）'}
          </button>

          {expanded && (
            <div className="space-y-7 pt-2 border-t border-[#1f1f1f]">
              {/* 狀態 */}
              <div className="pt-5">
                <label className="block text-[10px] tracking-[0.4em] text-[#c9a961]/60 mb-3">心情</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={`text-[12px] tracking-wider py-2.5 border transition-all ${
                        status === s
                          ? 'bg-[#c9a961] text-[#0a0a0a] border-[#c9a961] font-medium'
                          : 'border-[#2a2a2a] text-[#666]'
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 類型 */}
              <div>
                <label className="block text-[10px] tracking-[0.4em] text-[#c9a961]/60 mb-2">料理類型</label>
                <select
                  value={cuisineType}
                  onChange={e => setCuisineType(e.target.value)}
                  className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-[#c9a961]/40 px-3 py-2.5 text-[13px] text-[#f5f1e8] focus:outline-none"
                >
                  <option value="">—</option>
                  {CUISINE_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* 情境 */}
              <div>
                <label className="block text-[10px] tracking-[0.4em] text-[#c9a961]/60 mb-3">適合情境</label>
                <div className="flex flex-wrap gap-1.5">
                  {OCCASIONS.map(o => (
                    <button
                      key={o}
                      onClick={() => toggleOccasion(o)}
                      className={`text-[12px] tracking-wider px-3 py-1.5 border transition-colors ${
                        occasions.includes(o)
                          ? 'bg-[#c9a961]/15 text-[#c9a961] border-[#c9a961]/40'
                          : 'border-[#2a2a2a] text-[#666]'
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
                  <label className="block text-[10px] tracking-[0.4em] text-[#c9a961]/60 mb-3">評分</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => setRating(rating === n ? undefined : n)}
                        className={`text-2xl transition-colors ${
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
                <label className="block text-[10px] tracking-[0.4em] text-[#c9a961]/60 mb-2">筆記</label>
                <textarea
                  placeholder="必點品項、雷點、推薦時段..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-[#c9a961]/40 px-3 py-2.5 text-[13px] text-[#f5f1e8] placeholder-[#444] focus:outline-none resize-none leading-relaxed"
                />
              </div>

              <div className="text-[11px] tracking-wider text-[#555] leading-relaxed border-t border-[#1f1f1f] pt-5">
                候選店家在儲存後從詳情頁加。
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
