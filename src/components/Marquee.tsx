import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Pencil, X, Loader2, Check, Trash2, Send } from 'lucide-react';
import type { MarqueeData } from '../store/useMarquee';
import type { MarqueeMessage } from '../store/useMarqueeMessages';

interface Props {
  data: MarqueeData;                                  // 顏色 / 速度（仍存在 marquee 那一列）
  onUpdate: (next: MarqueeData) => Promise<void>;
  messages: MarqueeMessage[];                         // 已由新到舊排序
  onAdd: (text: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

// 情境色：key 存進資料庫（沿用舊 key，不用改資料），
// hex 是壓在深色底上的亮色版本；底色換過就要跟著重挑，否則會整條看不見。
const MARQUEE_COLORS: { key: string; label: string; hex: string }[] = [
  { key: 'gold', label: '香檳金', hex: '#e2c08d' },
  { key: 'rose', label: '玫瑰金', hex: '#e8a89a' },
  { key: 'red', label: '暖紅', hex: '#f0937f' },
  { key: 'teal', label: '丁香紫', hex: '#c8a8e0' },
];
function colorHexOf(key: string): string {
  return MARQUEE_COLORS.find(c => c.key === key)?.hex ?? '#e2c08d';
}

function usePrefersReducedMotion(): boolean {
  // 初始值直接讀 matchMedia（惰性初始化），effect 只負責訂閱變更
  const [reduce, setReduce] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const h = () => setReduce(mq.matches);
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }, []);
  return reduce;
}

// 跑馬燈是這條窄列唯一的內容，所以字給到標題級（22px / 700）並貼近左右邊緣。
// 注意：整條列的高度仍維持 safe-area + 56px（padding 8 + 44 + 4）——
// HomePage 的段落切換列就吸在這個 56px 底下，改高度要連那邊一起改。
const SPAN = 't-title';

// 跑馬燈同時只輪播最新這幾則；更舊的不刪，留在留言板的紀錄裡看得到
const MARQUEE_VISIBLE = 5;

// 跑馬燈文字：跟全站一樣走系統字，只用顏色點題，不再加光暈
function textStyle(hex: string): CSSProperties {
  return { color: hex };
}

// 共用的跑馬燈內容：每一則都從右緣外進場、往左走到左緣外，走完換下一則。
// 尊重「減少動態」：關掉捲動，改成置中靜止（多則就定時輪替）。
function MarqueeText({ lines, speed, hex, maskColor = 'var(--color-bg)' }: {
  lines: string[]; speed: number; hex: string; maskColor?: string;
}) {
  const reduce = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);
  const line = lines[idx % Math.max(lines.length, 1)] ?? '';

  // 進場距離要算出來才知道「右緣外」在哪：容器寬 + 這句話的寬。
  // 字體是非同步載入的，載入後寬度會變 → 用 ResizeObserver 而不是量一次就算。
  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [metrics, setMetrics] = useState<{ box: number; text: number } | null>(null);
  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = measureRef.current;
    if (!box || !text) return;
    const measure = () => setMetrics({ box: box.clientWidth, text: text.scrollWidth });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(text);
    return () => ro.disconnect();
  }, [line]);

  // 減少動態時沒有動畫可以接力，多則改用計時器輪替
  useEffect(() => {
    if (!reduce || lines.length < 2) return;
    const dwell = Math.max(2600, speed * 130);
    const t = setInterval(() => setIdx(i => (i + 1) % lines.length), dwell);
    return () => clearInterval(t);
  }, [reduce, lines.length, speed]);

  if (lines.length === 0) return null;

  const scrolling = !reduce && metrics !== null;

  return (
    <div ref={boxRef} className="relative w-full h-11 flex items-center overflow-hidden">
      {/* 量測用：不可見，只為了知道這句話多寬 */}
      <span ref={measureRef} aria-hidden className={`${SPAN} invisible absolute whitespace-nowrap`}>
        {line}
      </span>

      {/* 邊緣柔化只留 20px：再寬就會把放大後的字吃掉，失去滿版的感覺 */}
      <div className="absolute left-0 top-0 bottom-0 w-5 z-10 pointer-events-none" style={{ background: `linear-gradient(90deg, ${maskColor}, transparent)` }} />
      <div className="absolute right-0 top-0 bottom-0 w-5 z-10 pointer-events-none" style={{ background: `linear-gradient(270deg, ${maskColor}, transparent)` }} />

      {scrolling ? (
        // key 讓每一則都重新掛載，從右緣乾淨地重跑一次，不會接在上一則的半途
        <span
          key={idx}
          className={`${SPAN} absolute left-0 whitespace-nowrap will-change-transform`}
          style={{
            ...textStyle(hex),
            // speed ＝「跑完一趟」的秒數：8 快、60 慢
            animation: `marquee ${speed}s linear infinite`,
            ['--mq-from' as string]: `${metrics.box}px`,
            ['--mq-to' as string]: `${-metrics.text}px`,
          }}
          // 一則跑完才換下一則，不用另外計時
          onAnimationIteration={lines.length > 1 ? () => setIdx(i => (i + 1) % lines.length) : undefined}
        >
          {line}
        </span>
      ) : (
        <div className="w-full text-center px-3">
          <span className={`${SPAN} block truncate`} style={textStyle(hex)}>{line}</span>
        </div>
      )}
    </div>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function Marquee({ data, onUpdate, messages, onAdd, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  // 只輪播最新幾則；更舊的留在留言板裡，不會一直佔著跑馬燈
  const visible = messages.slice(0, MARQUEE_VISIBLE);

  if (visible.length === 0 && !editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 blur-bar border-b border-separator flex items-center justify-center gap-1.5 text-[12px] text-muted hover:text-tint transition-colors"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
          paddingBottom: '12px',
          minHeight: 'calc(env(safe-area-inset-top) + 56px)',
        }}
      >
        <Pencil size={11} />
        點此留言
      </button>
    );
  }

  return (
    <>
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 blur-bar border-b border-separator overflow-hidden"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', paddingBottom: '4px' }}
      >
        <button onClick={() => setEditing(true)} className="w-full" aria-label="打開留言板">
          <MarqueeText
            key={visible.map(m => m.id).join(',')}
            lines={visible.map(m => m.text)}
            speed={data.speed}
            hex={colorHexOf(data.color)}
          />
        </button>
      </div>

      {editing && (
        <MarqueeBoard
          data={data}
          messages={messages}
          onSave={onUpdate}
          onAdd={onAdd}
          onDelete={onDelete}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

// 留言板：上面留新訊息，下面是完整歷史（新到舊）。
// 只有最新 MARQUEE_VISIBLE 則會上跑馬燈，其餘留著當紀錄、不會被自動清掉。
function MarqueeBoard({
  data, messages, onSave, onAdd, onDelete, onClose,
}: {
  data: MarqueeData;
  messages: MarqueeMessage[];
  onSave: (d: MarqueeData) => Promise<void>;
  onAdd: (text: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [speed, setSpeed] = useState(data.speed);
  const [color, setColor] = useState(data.color || 'gold');
  const [saving, setSaving] = useState(false);

  const dirty = speed !== data.speed || color !== (data.color || 'gold');
  const visible = messages.slice(0, MARQUEE_VISIBLE);

  const handleSend = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    // 失敗時不清空輸入框（store 已跳 toast），內容留著讓使用者直接重送
    const ok = await onAdd(draft);
    if (ok) setDraft('');
    setSending(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await onSave({ text: data.text, speed, color });
    } catch {
      // 儲存失敗（useMarquee 已跳 toast 並還原）：留在原地讓使用者重試
    } finally {
      setSaving(false);
    }
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
        <div className="eyebrow">MESSAGES</div>
        {dirty ? (
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="btn-primary px-5 py-2 text-[13px] flex items-center gap-1.5"
          >
            {saving && <Loader2 size={12} className="animate-spin" />}
            儲存
          </button>
        ) : (
          <button onClick={onClose} className="btn-neutral px-5 py-2 text-[13px]">完成</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-7 space-y-8">
        {/* 留一則 */}
        <div>
          <div className="eyebrow-tc mb-3">留一則訊息</div>
          <textarea
            autoFocus
            placeholder="想跟對方說什麼？"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            rows={2}
            className="w-full bg-surface border border-separator focus:border-tint rounded-[14px] px-4 py-3 text-base text-text placeholder-muted focus:outline-none resize-none leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            className="btn-primary mt-3 w-full py-3.5 text-[14px] flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
            {sending ? '送出中' : '留言'}
          </button>
          <p className="t-caption mt-2 leading-relaxed">
            跑馬燈只會輪播最新 {MARQUEE_VISIBLE} 則，更舊的留在下面的紀錄裡，不會消失。
          </p>
        </div>

        {/* 預覽 */}
        {visible.length > 0 && (
          <div>
            <div className="eyebrow mb-2">PREVIEW</div>
            <div className="relative bg-bg border border-separator rounded-[14px] overflow-hidden h-11 flex items-center">
              <MarqueeText
                key={visible.map(m => m.id).join(',') + speed + color}
                lines={visible.map(m => m.text)}
                speed={speed}
                hex={colorHexOf(color)}
              />
            </div>
          </div>
        )}

        {/* 紀錄 */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="eyebrow-tc">全部留言</span>
            <span className="text-[12px] text-muted tabular-nums">{messages.length}</span>
          </div>
          {messages.length === 0 ? (
            <p className="t-caption">還沒有留言</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {messages.map((m, i) => (
                <li key={m.id} className="card-surface rounded-[14px] px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] text-text leading-snug break-words">{m.text}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-muted tabular-nums">{formatWhen(m.createdAt)}</span>
                      {i < MARQUEE_VISIBLE && (
                        <span className="text-[11px] font-semibold text-tint">顯示中</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm('刪除這則留言？')) void onDelete(m.id); }}
                    className="icon-btn !p-1.5 hover:!text-danger hover:!bg-danger-soft flex-shrink-0"
                    aria-label="刪除留言"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 顏色 */}
        <div>
          <div className="eyebrow-tc mb-3">顏色</div>
          <div className="flex gap-3">
            {MARQUEE_COLORS.map(c => (
              <button
                key={c.key}
                onClick={() => setColor(c.key)}
                aria-label={c.label}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95"
                style={{ background: c.hex, boxShadow: color === c.key ? `0 0 0 3px var(--color-bg), 0 0 0 5px ${c.hex}` : 'none' }}
              >
                {color === c.key && <Check size={16} className="text-on-accent" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        {/* 速度 */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="eyebrow-tc">速度</span>
            <span className="text-[12px] text-muted">跑完一趟的快慢</span>
          </div>
          <input
            type="range"
            min={8}
            max={60}
            step={2}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="w-full accent-tint"
          />
          <div className="flex justify-between text-[10px] text-muted mt-1">
            <span>快</span>
            <span>慢</span>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
