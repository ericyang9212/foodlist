import { useMemo, useState } from 'react';
import { X, Sparkles, Trash2, Check, Undo2, Loader2 } from 'lucide-react';
import { EmptyMark } from './EmptyMark';
import type { Wish } from '../types';

interface Props {
  items: Wish[];
  loading: boolean;
  onAdd: (text: string) => Promise<boolean>;
  onDelete: (id: string) => void;
  onStartFulfill: (wish: Wish) => void;
  onUnfulfill: (id: string) => void;
  onClose: () => void;
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

// 許願池：跟站上其他地方相反，這裡不用講明確吃什麼、哪間店。
// 想去海邊、想吃點辣的、想睡到自然醒都可以，寫下來讓對方看到就好。
export function WishPoolModal({
  items, loading, onAdd, onDelete, onStartFulfill, onUnfulfill, onClose,
}: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const { open, done } = useMemo(() => ({
    open: items.filter(w => !w.fulfilledAt),
    done: items.filter(w => w.fulfilledAt),
  }), [items]);

  const canSend = text.trim().length > 0 && !sending;

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    const ok = await onAdd(text);
    setSending(false);
    // 失敗就留住內容讓使用者重送——不能清空，那等於把人打的字吃掉
    if (ok) setText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg animate-fadein" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div
        className="flex items-center justify-between px-6 pb-4 border-b border-separator"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button onClick={onClose} className="icon-btn" aria-label="關閉">
          <X size={22} />
        </button>
        <div className="flex items-center gap-2 text-[12px] text-tint">
          <Sparkles size={13} />
          許願池
        </div>
        <div className="w-7" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* ── 許一個願 ── */}
        <div className="mb-8">
          <label className="eyebrow-tc block mb-2" htmlFor="wish-input">許一個願</label>
          <textarea
            id="wish-input"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={2}
            className="w-full bg-surface border border-separator focus:border-tint rounded-[16px] px-4 py-3 text-[15px] text-text focus:outline-none resize-none"
          />
          <button
            onClick={submit}
            disabled={!canSend}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 mt-3 text-[15px] disabled:opacity-40"
          >
            {sending && <Loader2 size={14} className="animate-spin" />}
            許願
          </button>
          <p className="t-caption mt-2">
            不用寫明確吃什麼或哪間店——想去哪、想做什麼都可以
          </p>
        </div>

        {/* ── 許願中 ── */}
        <div className="rule mb-4" />
        <div className="flex items-baseline gap-2 mb-3">
          <h3 className="t-heading">許願中</h3>
          {open.length > 0 && (
            <span className="text-[12px] font-medium text-tint tabular-nums">{open.length}</span>
          )}
        </div>

        {loading && items.length === 0 ? (
          <p className="eyebrow py-6 text-center">LOADING</p>
        ) : open.length > 0 ? (
          <ul className="space-y-2 stagger">
            {/* 按鈕放第二行：願望常常是一整句，跟按鈕擠同一行會把文字壓成很窄一條，
                而且「實現了」要有 44px 高的點擊區（它不是 icon-btn，沒有那個隱形熱區） */}
            {open.map(w => (
              <li key={w.id} className="card-surface rounded-[16px] p-4">
                <p className="text-[15px] text-text break-words">{w.text}</p>
                <div className="flex items-center gap-2 mt-2.5">
                  <p className="t-caption flex-1 min-w-0">{dateLabel(w.createdAt)}</p>
                  <button
                    onClick={() => onStartFulfill(w)}
                    className="btn-secondary flex items-center gap-1.5 px-4 py-3.5 text-[13px] flex-shrink-0"
                  >
                    <Check size={14} />
                    實現了
                  </button>
                  <button
                    onClick={() => { if (confirm('刪掉這個願望？')) onDelete(w.id); }}
                    className="icon-btn !p-1 hover:!text-danger hover:!bg-danger-soft flex-shrink-0"
                    aria-label="刪除願望"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <EmptyMark className="mb-3" />
            <p className="text-muted text-[14px]">還沒有願望</p>
          </div>
        )}

        {/* ── 已實現 ── */}
        {done.length > 0 && (
          <>
            <div className="rule mt-8 mb-4" />
            <div className="flex items-baseline gap-2 mb-3">
              <h3 className="t-heading">已實現</h3>
              <span className="text-[12px] font-medium text-gold tabular-nums">{done.length}</span>
            </div>
            <ul className="space-y-2">
              {done.map(w => (
                <li key={w.id} className="card-surface rounded-[16px] p-4 flex items-start gap-3 opacity-80">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] text-text break-words">{w.text}</p>
                    {w.fulfilledNote && (
                      <p className="t-caption italic mt-1">「{w.fulfilledNote}」</p>
                    )}
                    <p className="text-[12px] text-gold mt-1 tabular-nums">
                      {dateLabel(w.fulfilledAt!)} 實現
                    </p>
                  </div>
                  <button
                    onClick={() => onUnfulfill(w.id)}
                    className="icon-btn !p-1 flex-shrink-0"
                    aria-label="取消實現"
                    title="按錯了？改回許願中（已記下的足跡不會刪）"
                  >
                    <Undo2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <p className="t-caption mt-3">
              實現的願望會一起記進足跡，舊的願望不會消失
            </p>
          </>
        )}
      </div>
    </div>
  );
}
