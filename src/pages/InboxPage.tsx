import { useState, useRef } from 'react';
import { ImagePlus, Check, Trash2, ArrowRight, X, Loader2, ArrowLeft } from 'lucide-react';
import type { Inspiration } from '../types';
import { PLATFORM_LABELS } from '../types';
import { safeHttpUrl } from '../lib/url';

interface Props {
  items: Inspiration[];
  loading: boolean;
  onUpload: (file: File, note: string) => Promise<void>;
  onDelete: (id: string) => void;
  onUpdate: (insp: Inspiration) => void;
  onConvertToFood: (insp: Inspiration) => void;
  onClose: () => void;
}

export function InboxPage({ items, loading, onUpload, onDelete, onUpdate, onConvertToFood, onClose }: Props) {
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
        <button onClick={onClose} className="p-1">
          <ArrowLeft size={22} className="text-[#8a8478]" />
        </button>
        <div className="text-[12px] tracking-[0.4em] text-[#c9a961]/80">想吃的 · 靈感匣</div>
        <div className="w-7" />
      </div>

      <div className="px-6 pt-6 pb-5">
        <p className="text-[13px] text-[#777] tracking-wider leading-relaxed">
          看到想吃的，先丟進來，之後再整理成想吃清單
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-28">
        {/* 上傳區塊 */}
        <div className="mb-6">
          {pendingPreview ? (
            <div className="bg-[#0f0f0f] border border-[#c9a961]/30 p-4">
              <div className="relative mb-3">
                <img src={pendingPreview} alt="" className="w-full max-h-64 object-contain bg-black" />
                <button
                  onClick={() => { setPendingFile(null); setPendingPreview(null); setPendingNote(''); }}
                  className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
              <textarea
                placeholder="加一句備註（哪看到的、想吃什麼）"
                value={pendingNote}
                onChange={e => setPendingNote(e.target.value)}
                rows={2}
                className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-[#c9a961]/40 px-3 py-2.5 text-[14px] text-[#f5f1e8] placeholder-[#555] focus:outline-none resize-none"
              />
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn-primary mt-3 w-full py-3 text-[14px] tracking-[0.3em] flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {uploading ? '上傳中' : '收進靈感匣'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border border-dashed border-[#c9a961]/40 hover:border-[#c9a961] hover:bg-[#c9a961]/5 bg-[#0f0d0a] rounded-[6px] py-8 flex flex-col items-center justify-center gap-3 transition-all"
            >
              <ImagePlus size={32} className="text-[#c9a961]" />
              <div className="text-[14px] text-[#c9a961] tracking-[0.3em]">上傳截圖</div>
              <div className="text-[12px] text-[#666] tracking-wider">IG / Threads / 朋友傳的</div>
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

        {/* 統計 */}
        {items.length > 0 && (
          <div className="flex items-center gap-4 mb-5 text-[12px] tracking-[0.3em]">
            <span className="text-[#c9a961]">未處理 · {pending.length}</span>
            {converted.length > 0 && (
              <span className="text-[#666]">已整理 · {converted.length}</span>
            )}
          </div>
        )}

        {/* 未處理區 */}
        {pending.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5 mb-8">
            {pending.map(insp => (
              <InspirationThumbnail
                key={insp.id}
                insp={insp}
                onClick={() => setSelected(insp)}
              />
            ))}
          </div>
        )}

        {/* 相簿：已整理過的截圖收藏 */}
        {converted.length > 0 && (
          <div className="mt-2">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-[14px] tracking-[0.3em] text-[#c9a961]/90">相簿</span>
              <span className="text-[11px] text-[#666] tracking-widest">{converted.length}</span>
            </div>
            <div className="text-[11px] text-[#666] tracking-wider mb-3">整理過的截圖都收進這本相簿</div>
            <div className="grid grid-cols-3 gap-1.5">
              {converted.map(insp => (
                <InspirationThumbnail key={insp.id} insp={insp} small hideCheck onClick={() => setSelected(insp)} />
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-3">— —</div>
            <p className="text-[#777] text-[14px] tracking-wider">尚未收任何靈感</p>
          </div>
        )}
      </div>

      {/* 靈感詳細 */}
      {selected && (
        <InspirationDetail
          insp={selected}
          onClose={() => setSelected(null)}
          onDelete={() => { onDelete(selected.id); setSelected(null); }}
          onUpdate={(next) => { onUpdate(next); setSelected(next); }}
          onConvert={() => { onConvertToFood(selected); setSelected(null); }}
        />
      )}
    </div>
  );
}

function InspirationThumbnail({
  insp, onClick, small, hideCheck,
}: { insp: Inspiration; onClick: () => void; small?: boolean; hideCheck?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`relative bg-[#161616] border border-[#2a2a2a] rounded-[5px] overflow-hidden active:scale-[0.98] transition-transform ${
        small ? 'aspect-square' : 'aspect-[3/4]'
      }`}
    >
      {insp.imageUrl ? (
        <img src={insp.imageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[#555] text-[11px]">無圖</div>
      )}
      {insp.note && !small && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-3 py-2">
          <p className="text-[12px] text-[#f5f1e8] line-clamp-2 leading-tight">{insp.note}</p>
        </div>
      )}
      {insp.convertedFoodId && !hideCheck && (
        <div className="absolute top-1.5 right-1.5 bg-[#c9a961] text-[#0a0a0a] p-0.5 rounded-full">
          <Check size={10} strokeWidth={3} />
        </div>
      )}
    </button>
  );
}

function InspirationDetail({
  insp, onClose, onDelete, onUpdate, onConvert,
}: {
  insp: Inspiration;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (insp: Inspiration) => void;
  onConvert: () => void;
}) {
  const [note, setNote] = useState(insp.note ?? '');
  const [baseNote, setBaseNote] = useState(insp.note ?? '');
  const noteChanged = note.trim() !== baseNote.trim();

  const saveNote = () => {
    const trimmed = note.trim();
    onUpdate({ ...insp, note: trimmed || undefined });
    setBaseNote(trimmed);
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
          <div className="bg-black">
            <img src={insp.imageUrl} alt="" className="w-full max-h-[55vh] object-contain mx-auto" />
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
          className="px-6 pt-4 border-t border-[#1f1f1f] flex items-center justify-between gap-4"
          style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom))' }}
        >
          <span className="text-[13px] tracking-widest text-[#666]">已加入想吃清單 ✓</span>
          <button
            onClick={() => { if (confirm('刪除這張截圖？')) onDelete(); }}
            className="btn-neutral px-4 py-2.5 text-[13px] tracking-[0.2em] flex items-center gap-1.5"
          >
            <Trash2 size={14} />
            刪除
          </button>
        </div>
      )}
    </div>
  );
}
