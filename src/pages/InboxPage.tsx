import { useState, useRef } from 'react';
import { ImagePlus, Check, Trash2, ArrowRight, X, Loader2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Inspiration, FoodItem } from '../types';
import { PLATFORM_LABELS } from '../types';
import { safeHttpUrl } from '../lib/url';
import { Thumb } from '../components/Thumb';

interface Props {
  items: Inspiration[];
  loading: boolean;
  onUpload: (file: File, note: string) => Promise<void>;
  onDelete: (id: string) => void;
  onUpdate: (insp: Inspiration) => void;
  onConvertToFood: (insp: Inspiration) => void;
  foodById: Record<string, FoodItem>;
  onOpenFood: (foodId: string) => void;
  onClose: () => void;
}

export function InboxPage({ items, loading, onUpload, onDelete, onUpdate, onConvertToFood, foodById, onOpenFood, onClose }: Props) {
  const [selected, setSelected] = useState<Inspiration | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [pendingNote, setPendingNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const pending = items.filter(i => !i.convertedFoodId);
  const converted = items.filter(i => !!i.convertedFoodId);

  const handleFile = (file: File) => {
    setPendingFile(file);
    const reader = new FileReader();
    reader.onload = () => setPendingPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      await onUpload(pendingFile, pendingNote);
      setPendingFile(null);
      setPendingPreview(null);
      setPendingNote('');
    } catch (e) {
      alert('上傳失敗，請再試一次');
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0a0a0a]" style={{ maxWidth: 430, margin: '0 auto' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 pb-3 border-b border-[#1f1f1f]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button onClick={onClose} className="icon-btn">
          <ArrowLeft size={22} className="text-[#8a8478]" />
        </button>
        <div className="text-[12px] tracking-[0.4em] text-[#c9a961]/80">靈感匣</div>
        <div className="w-7" />
      </div>

      {/* 介紹 */}
      <div className="px-6 pt-5 pb-4">
        <div className="text-[10px] tracking-[0.5em] text-[#c9a961]/60 mb-2">INSPIRATIONS</div>
        <p className="text-[13px] text-[#8a8478] tracking-wider leading-relaxed">
          看到想吃的，先丟進來，之後再整理成想吃清單
        </p>
        <div className="mt-4 h-[1px] bg-gradient-to-r from-[#c9a961]/40 via-[#c9a961]/10 to-transparent" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-28">
        {/* 上傳區塊 */}
        <div className="mb-9 mt-2">
          {pendingPreview ? (
            <div className="bg-gradient-to-br from-[#15120d] to-[#0d0b08] border border-[#c9a961]/30 rounded-[12px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
              <div className="relative mb-3 rounded-[8px] overflow-hidden">
                <img src={pendingPreview} alt="" className="w-full max-h-64 object-contain bg-black" />
                <button
                  onClick={() => { setPendingFile(null); setPendingPreview(null); setPendingNote(''); }}
                  className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-full hover:bg-black/80 transition-colors"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
              <textarea
                placeholder="加一句備註（哪看到的、想吃什麼）"
                value={pendingNote}
                onChange={e => setPendingNote(e.target.value)}
                rows={2}
                className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-[#c9a961]/40 rounded-[6px] px-3 py-2.5 text-[14px] text-[#f5f1e8] placeholder-[#555] focus:outline-none resize-none leading-relaxed transition-colors"
              />
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn-primary mt-3 w-full py-3.5 text-[14px] tracking-[0.3em] flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {uploading ? '上傳中' : '收進靈感匣'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="group w-full rounded-[12px] border border-[#c9a961]/25 bg-gradient-to-br from-[#15120d] to-[#0d0b08] hover:border-[#c9a961]/60 hover:shadow-[0_4px_28px_rgba(201,169,97,0.12)] py-9 flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.99]"
            >
              <div className="w-14 h-14 rounded-full bg-[#c9a961]/10 border border-[#c9a961]/30 flex items-center justify-center group-hover:bg-[#c9a961]/15 transition-colors">
                <ImagePlus size={24} className="text-[#c9a961]" />
              </div>
              <div className="text-[14px] text-[#e6c87a] tracking-[0.3em]">上傳截圖</div>
              <div className="text-[11px] text-[#666] tracking-[0.2em]">IG · Threads · 朋友傳的</div>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>

        {/* 未整理 */}
        {pending.length > 0 && (
          <section className="mb-9">
            <SectionHeader overline="TO SORT" title="未整理" count={pending.length} />
            <div className="grid grid-cols-2 gap-3">
              {pending.map(insp => (
                <InspirationThumbnail
                  key={insp.id}
                  insp={insp}
                  onClick={() => setSelected(insp)}
                />
              ))}
            </div>
          </section>
        )}

        {/* 相簿：已整理過的截圖收藏 */}
        {converted.length > 0 && (
          <section>
            <SectionHeader
              overline="ALBUM"
              title="相簿"
              count={converted.length}
              subtitle="整理過的截圖都收進這本相簿"
            />
            <div className="grid grid-cols-3 gap-2">
              {converted.map(insp => (
                <InspirationThumbnail key={insp.id} insp={insp} small hideCheck onClick={() => setSelected(insp)} />
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-3">— —</div>
            <p className="text-[#777] text-[14px] tracking-wider">尚未收任何靈感</p>
            <p className="text-[#555] text-[12px] tracking-widest mt-1.5">用上面的按鈕收第一張截圖</p>
          </div>
        )}
      </div>

      {/* 靈感詳細（同一區的截圖可左右滑換頁，像翻相簿） */}
      {selected && (() => {
        const siblings = selected.convertedFoodId ? converted : pending;
        const idx = siblings.findIndex(i => i.id === selected.id);
        return (
          <InspirationDetail
            key={selected.id}
            insp={selected}
            position={idx >= 0 ? { index: idx, total: siblings.length } : undefined}
            onPrev={idx > 0 ? () => setSelected(siblings[idx - 1]) : undefined}
            onNext={idx >= 0 && idx < siblings.length - 1 ? () => setSelected(siblings[idx + 1]) : undefined}
            onClose={() => setSelected(null)}
            onDelete={() => { onDelete(selected.id); setSelected(null); }}
            onUpdate={(next) => { onUpdate(next); setSelected(next); }}
            onConvert={() => { onConvertToFood(selected); setSelected(null); }}
            linkedFood={selected.convertedFoodId ? foodById[selected.convertedFoodId] : undefined}
            onOpenFood={onOpenFood}
          />
        );
      })()}
    </div>
  );
}

// 區段標題：金色 overline + 細金線 + 數量，下方襯線標題
function SectionHeader({
  overline, title, count, subtitle,
}: { overline: string; title: string; count: number; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5">
        <span className="text-[10px] tracking-[0.45em] text-[#c9a961]/55">{overline}</span>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-[#c9a961]/25 to-transparent" />
        <span className="text-[11px] text-[#777] tracking-widest tabular-nums">{count}</span>
      </div>
      <h2
        className="text-[19px] text-[#f5f1e8] tracking-[0.18em] font-medium mt-2"
        style={{ fontFamily: "'Noto Serif TC', serif" }}
      >
        {title}
      </h2>
      {subtitle && <p className="text-[11px] text-[#666] tracking-wider mt-1">{subtitle}</p>}
    </div>
  );
}

function InspirationThumbnail({
  insp, onClick, small, hideCheck,
}: { insp: Inspiration; onClick: () => void; small?: boolean; hideCheck?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group relative bg-[#161616] border border-[#262626] rounded-[8px] overflow-hidden active:scale-[0.97] hover:border-[#c9a961]/40 transition-all ${
        small ? 'aspect-square' : 'aspect-[3/4]'
      }`}
    >
      {insp.imageUrl ? (
        <Thumb
          src={insp.imageUrl}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[#555] text-[11px] tracking-wider">無圖</div>
      )}
      {/* 邊框內陰影，增加層次 */}
      <div className="pointer-events-none absolute inset-0 rounded-[8px] ring-1 ring-inset ring-white/5" />
      {insp.note && !small && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent px-3 pt-6 pb-2.5">
          <p className="text-[12px] text-[#f0ece0] line-clamp-2 leading-snug tracking-wide">{insp.note}</p>
        </div>
      )}
      {insp.convertedFoodId && !hideCheck && (
        <div className="absolute top-2 right-2 bg-[#c9a961] text-[#0a0a0a] p-0.5 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
          <Check size={10} strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

function InspirationDetail({
  insp, onClose, onDelete, onUpdate, onConvert, linkedFood, onOpenFood, onPrev, onNext, position,
}: {
  insp: Inspiration;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (insp: Inspiration) => void;
  onConvert: () => void;
  linkedFood?: FoodItem;
  onOpenFood: (foodId: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  position?: { index: number; total: number };
}) {
  const [note, setNote] = useState(insp.note ?? '');
  const [baseNote, setBaseNote] = useState(insp.note ?? '');
  const noteChanged = note.trim() !== baseNote.trim();
  const touchStartX = useRef<number | null>(null);

  const saveNote = () => {
    const trimmed = note.trim();
    onUpdate({ ...insp, note: trimmed || undefined });
    setBaseNote(trimmed);
  };

  // 左右滑切換上一張 / 下一張
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > 60 && onPrev) onPrev();
    else if (delta < -60 && onNext) onNext();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div
        className="flex items-center justify-between px-6 pb-4 border-b border-[#1f1f1f]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button onClick={onClose} className="icon-btn">
          <X size={22} className="text-[#8a8478]" />
        </button>
        <div className="text-[12px] tracking-[0.4em] text-[#c9a961]/80">靈感</div>
        <button onClick={() => { if (confirm('刪除這個靈感？')) onDelete(); }} className="icon-btn">
          <Trash2 size={19} className="text-[#a85959]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {insp.imageUrl && (
          <div className="px-5 pt-5">
            <div
              className="relative rounded-[10px] overflow-hidden border border-[#1f1f1f] bg-black shadow-[0_6px_24px_rgba(0,0,0,0.45)]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img src={insp.imageUrl} alt="" className="w-full max-h-[52vh] object-contain mx-auto" />

              {/* 翻頁箭頭 */}
              {onPrev && (
                <button
                  onClick={onPrev}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-black/45 backdrop-blur-sm rounded-full p-1.5 text-[#e6c87a] hover:bg-black/70 transition-colors"
                  aria-label="上一張"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              {onNext && (
                <button
                  onClick={onNext}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/45 backdrop-blur-sm rounded-full p-1.5 text-[#e6c87a] hover:bg-black/70 transition-colors"
                  aria-label="下一張"
                >
                  <ChevronRight size={20} />
                </button>
              )}

              {/* 頁碼 */}
              {position && position.total > 1 && (
                <div className="absolute bottom-2 right-2.5 bg-black/55 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-[11px] tracking-[0.2em] text-[#d6c89a] tabular-nums">
                  {position.index + 1} / {position.total}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-6 py-6 space-y-5">
          {/* 備註：可直接編輯 */}
          <div>
            <div className="text-[12px] tracking-[0.4em] text-[#c9a961]/60 mb-2">備註</div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="加一句備註（哪看到的、想吃什麼）"
              className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-[#c9a961]/40 px-3 py-2.5 text-[15px] text-[#f5f1e8] placeholder-[#555] focus:outline-none resize-none leading-relaxed"
            />
            {noteChanged && (
              <button
                onClick={saveNote}
                className="btn-primary mt-2 px-4 py-2 text-[13px] tracking-[0.2em] flex items-center gap-1.5"
              >
                <Check size={14} /> 儲存備註
              </button>
            )}
          </div>
          {insp.platform && (
            <div>
              <div className="text-[12px] tracking-[0.4em] text-[#c9a961]/60 mb-2">來源</div>
              <p className="text-[#8a8478] text-[14px]">{PLATFORM_LABELS[insp.platform] ?? insp.platform}</p>
            </div>
          )}
          {safeHttpUrl(insp.sourceUrl) && (
            <a
              href={safeHttpUrl(insp.sourceUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[13px] text-[#c9a961] underline underline-offset-4 break-all"
            >
              {insp.sourceUrl}
            </a>
          )}

          <div className="text-[12px] tracking-widest text-[#555] border-t border-[#1f1f1f] pt-4">
            {new Date(insp.createdAt).toLocaleDateString('zh-TW')}
          </div>
        </div>
      </div>

      {/* 底部主要動作：整理成想吃，強化視覺權重 */}
      {!insp.convertedFoodId && (
        <div
          className="px-6 pt-5 pb-5 border-t border-[#c9a961]/30 bg-gradient-to-t from-[#1a1612] to-[#0a0a0a]"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          <div className="text-[10px] tracking-[0.5em] text-[#c9a961]/70 mb-3 text-center">
            DECIDE TO EAT
          </div>
          <button
            onClick={onConvert}
            className="btn-primary w-full py-5 text-[16px] tracking-[0.3em] flex items-center justify-center gap-2"
          >
            整理成想吃清單
            <ArrowRight size={20} strokeWidth={2.5} />
          </button>
        </div>
      )}
      {insp.convertedFoodId && (
        <div
          className="px-6 pt-4 border-t border-[#1f1f1f] space-y-3"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          {linkedFood ? (
            <button
              onClick={() => onOpenFood(insp.convertedFoodId!)}
              className="w-full flex items-center gap-4 bg-[#0f0f0f] border border-[#c9a961]/30 hover:border-[#c9a961]/60 hover:bg-[#c9a961]/5 rounded-[6px] active:scale-[0.99] transition-all px-5 py-4 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-[0.4em] text-[#c9a961]/70 mb-1">已整理成</div>
                <div className="text-[17px] text-[#f5f1e8] tracking-wide truncate">{linkedFood.name}</div>
              </div>
              <ArrowRight size={20} className="text-[#c9a961] flex-shrink-0" strokeWidth={2.5} />
            </button>
          ) : (
            <div className="text-[13px] tracking-widest text-[#666] text-center py-1">已加入想吃清單 ✓</div>
          )}
          <button
            onClick={() => { if (confirm('刪除這張截圖？')) onDelete(); }}
            className="w-full flex items-center justify-center gap-1.5 text-[13px] tracking-[0.2em] text-[#8a8478] hover:text-[#a85959] py-2 transition-colors"
          >
            <Trash2 size={14} />
            刪除這張截圖
          </button>
        </div>
      )}
    </div>
  );
}
