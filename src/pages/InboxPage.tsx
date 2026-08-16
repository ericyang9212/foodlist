import { useState, useRef } from 'react';
import { ImagePlus, Check, Trash2, ArrowRight, X, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Inspiration, FoodItem } from '../types';
import { PLATFORM_LABELS } from '../types';
import { safeHttpUrl } from '../lib/url';
import { toast } from '../lib/toast';
import { Thumb } from '../components/Thumb';
import { EmptyMark } from '../components/EmptyMark';

interface Props {
  items: Inspiration[];
  loading: boolean;
  onUpload: (file: File, note: string) => Promise<void>;
  onDelete: (id: string) => void;
  onUpdate: (insp: Inspiration) => void;
  onConvertToFood: (insp: Inspiration) => void;
  foodById: Record<string, FoodItem>;
  onOpenFood: (foodId: string) => void;
}

export function InboxPage({ items, loading, onUpload, onDelete, onUpdate, onConvertToFood, foodById, onOpenFood }: Props) {
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
      toast.error('上傳失敗，請再試一次');
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  return (
    // 合併主畫面裡的「靈感匣」段落：不再是全螢幕彈窗，跟著 HomePage 一起捲
    <div>
      <div className="px-6 pt-5 pb-4">
        <div className="eyebrow mb-2">INSPIRATIONS</div>
        <h2 className="t-title mb-2">
          靈感匣
        </h2>
        <p className="text-[13px] text-muted leading-relaxed">
          看到想吃的，先丟進來，之後再整理成想吃清單
        </p>
        <div className="rule mt-4" />
      </div>

      <div className="px-6 pb-28">
        {/* 上傳區塊 */}
        <div className="mb-9 mt-2">
          {pendingPreview ? (
            <div className="bg-surface border border-separator rounded-[16px] p-4 shadow-[var(--shadow-raised)]">
              <div className="relative mb-3 rounded-[14px] overflow-hidden">
                <img src={pendingPreview} alt="" className="w-full max-h-64 object-contain bg-fill" />
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
                className="w-full bg-surface border border-separator focus:border-tint rounded-[12px] px-3 py-2.5 text-base text-text placeholder-muted focus:outline-none resize-none leading-relaxed transition-colors"
              />
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn-primary mt-3 w-full py-3.5 text-[14px] flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {uploading ? '上傳中' : '收進靈感匣'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="group w-full rounded-[20px] border border-dashed border-line bg-surface hover:bg-mauve-soft py-9 flex flex-col items-center justify-center gap-3 transition-colors active:scale-[0.99]"
            >
              <div className="w-14 h-14 rounded-full bg-mauve-soft flex items-center justify-center transition-transform duration-200 ease-[var(--ease-out-quint)] group-active:scale-90">
                <ImagePlus size={24} className="text-mauve" />
              </div>
              <div className="t-heading text-mauve">上傳截圖</div>
              <div className="t-caption">IG · Threads · 朋友傳的</div>
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
            <EmptyMark className="mb-3" />
            <p className="text-muted text-[14px]">尚未收任何靈感</p>
            <p className="text-muted text-[12px] mt-1.5">用上面的按鈕收第一張截圖</p>
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

// 區段標題：眉標 + 數量在同一行，下方是標題（iOS 分組列表的作法）
function SectionHeader({
  overline, title, count, subtitle,
}: { overline: string; title: string; count: number; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2.5">
        <span className="eyebrow">{overline}</span>
        <div className="h-[1px] flex-1 bg-separator" />
        <span className="text-[12px] font-medium text-muted tabular-nums">{count}</span>
      </div>
      <h2 className="t-heading mt-2">{title}</h2>
      {subtitle && <p className="t-caption mt-1">{subtitle}</p>}
    </div>
  );
}

function InspirationThumbnail({
  insp, onClick, small, hideCheck,
}: { insp: Inspiration; onClick: () => void; small?: boolean; hideCheck?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`group relative bg-fill rounded-[16px] overflow-hidden shadow-[var(--shadow-card)] transition-transform duration-200 ease-[var(--ease-out-quint)] active:scale-[0.96] ${
        small ? 'aspect-square' : 'aspect-[3/4]'
      }`}
    >
      {insp.imageUrl ? (
        <Thumb
          src={insp.imageUrl}
          className="w-full h-full object-cover transition-transform duration-500 ease-[var(--ease-ios)] group-hover:scale-[1.06]"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted text-[11px]">無圖</div>
      )}
      {insp.note && !small && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pt-6 pb-2.5">
          <p className="text-[12px] text-white line-clamp-2 leading-snug text-left">{insp.note}</p>
        </div>
      )}
      {insp.convertedFoodId && !hideCheck && (
        <div className="absolute top-2 right-2 bg-gold text-on-accent p-1 rounded-full shadow-[var(--shadow-raised)]">
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
    <div className="fixed inset-0 z-50 flex flex-col bg-bg animate-fadein" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div
        className="flex items-center justify-between px-6 pb-4 border-b border-separator"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button onClick={onClose} className="icon-btn" aria-label="關閉">
          <X size={22} className="text-muted" />
        </button>
        <div className="eyebrow">靈感</div>
        <button onClick={() => { if (confirm('刪除這個靈感？')) onDelete(); }} className="icon-btn" aria-label="刪除靈感">
          <Trash2 size={19} className="text-danger" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {insp.imageUrl && (
          <div className="px-5 pt-5">
            <div
              className="relative rounded-[16px] overflow-hidden border border-separator bg-black shadow-[var(--shadow-raised)]"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img src={insp.imageUrl} alt="" className="w-full max-h-[52vh] object-contain mx-auto" />

              {/* 翻頁箭頭 */}
              {onPrev && (
                <button
                  onClick={onPrev}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-black/45 backdrop-blur-sm rounded-full p-1.5 text-white hover:bg-black/70 transition-colors"
                  aria-label="上一張"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              {onNext && (
                <button
                  onClick={onNext}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black/45 backdrop-blur-sm rounded-full p-1.5 text-white hover:bg-black/70 transition-colors"
                  aria-label="下一張"
                >
                  <ChevronRight size={20} />
                </button>
              )}

              {/* 頁碼 */}
              {position && position.total > 1 && (
                <div className="absolute bottom-2 right-2.5 bg-black/55 backdrop-blur-sm rounded-full px-2.5 py-0.5 text-[11px] text-white tabular-nums">
                  {position.index + 1} / {position.total}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="px-6 py-6 space-y-5">
          {/* 備註：可直接編輯 */}
          <div>
            <div className="text-[12px] text-tint mb-2">備註</div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="加一句備註（哪看到的、想吃什麼）"
              className="w-full bg-surface border border-separator focus:border-tint px-3 py-2.5 text-base text-text placeholder-muted focus:outline-none resize-none leading-relaxed"
            />
            {noteChanged && (
              <button
                onClick={saveNote}
                className="btn-primary mt-2 px-4 py-2 text-[13px] flex items-center gap-1.5"
              >
                <Check size={14} /> 儲存備註
              </button>
            )}
          </div>
          {insp.platform && (
            <div>
              <div className="text-[12px] text-tint mb-2">來源</div>
              <p className="text-muted text-[14px]">{PLATFORM_LABELS[insp.platform] ?? insp.platform}</p>
            </div>
          )}
          {safeHttpUrl(insp.sourceUrl) && (
            <a
              href={safeHttpUrl(insp.sourceUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[13px] text-tint underline underline-offset-4 break-all"
            >
              {insp.sourceUrl}
            </a>
          )}

          <div className="text-[12px] text-muted border-t border-separator pt-4">
            {new Date(insp.createdAt).toLocaleDateString('zh-TW')}
          </div>
        </div>
      </div>

      {/* 底部主要動作：整理成想吃，強化視覺權重 */}
      {!insp.convertedFoodId && (
        <div
          className="px-6 pt-5 pb-5 border-t border-separator bg-gradient-to-t from-surface to-bg"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          <div className="eyebrow mb-3 text-center">
            DECIDE TO EAT
          </div>
          <button
            onClick={onConvert}
            className="btn-primary w-full py-5 text-[16px] flex items-center justify-center gap-2"
          >
            整理成想吃清單
            <ArrowRight size={20} strokeWidth={2.5} />
          </button>
        </div>
      )}
      {insp.convertedFoodId && (
        <div
          className="px-6 pt-4 border-t border-separator space-y-3"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          {linkedFood ? (
            <button
              onClick={() => onOpenFood(insp.convertedFoodId!)}
              className="w-full flex items-center gap-4 bg-surface border border-separator hover:border-line hover:bg-fill rounded-[12px] active:scale-[0.99] transition-all px-5 py-4 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="eyebrow-tc mb-1">已整理成</div>
                <div className="text-[17px] text-text truncate">{linkedFood.name}</div>
              </div>
              <ArrowRight size={20} className="text-tint flex-shrink-0" strokeWidth={2.5} />
            </button>
          ) : (
            <div className="text-[13px] text-muted text-center py-1">已加入想吃清單 ✓</div>
          )}
          <button
            onClick={() => { if (confirm('刪除這張截圖？')) onDelete(); }}
            className="w-full flex items-center justify-center gap-1.5 text-[13px] text-muted hover:text-danger py-2 transition-colors"
          >
            <Trash2 size={14} />
            刪除這張截圖
          </button>
        </div>
      )}
    </div>
  );
}
