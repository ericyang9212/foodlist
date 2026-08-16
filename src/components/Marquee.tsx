import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { Pencil, X, Loader2, Check } from 'lucide-react';
import type { MarqueeData } from '../store/useMarquee';

interface Props {
  data: MarqueeData;
  onUpdate: (next: MarqueeData) => Promise<void>;
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

// 跑馬燈文字：跟全站一樣走系統字，只用顏色點題，不再加光暈
function textStyle(hex: string): CSSProperties {
  return { color: hex };
}

// 共用的跑馬燈內容：單句連續橫向捲動、多則淡入淡出輪播；尊重「減少動態」
function MarqueeText({ lines, speed, hex, maskColor = 'var(--color-bg)' }: {
  lines: string[]; speed: number; hex: string; maskColor?: string;
}) {
  const isMulti = lines.length >= 2;
  const reduce = usePrefersReducedMotion();
  const [idx, setIdx] = useState(0);

  // 單句只有「字比列還寬」才需要捲動。塞得下卻照捲，會同時看到兩份複本
  // （捲動是靠複製一份接在後面做無縫循環），看起來像訊息被重複了一次。
  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);
  useLayoutEffect(() => {
    if (isMulti) return;
    const box = boxRef.current;
    const text = measureRef.current;
    if (!box || !text) return;
    // 字體是非同步載入的，寬度會在載入後改變 → 用 ResizeObserver 而不是量一次就算
    const measure = () => setOverflows(text.scrollWidth > box.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(text);
    return () => ro.disconnect();
  }, [isMulti, lines]);

  // 多則：定時淡入淡出切換。
  // 內容變更時由呼叫端用 key remount 重置 idx，effect 裡不需要同步 setState。
  useEffect(() => {
    if (!isMulti) return;
    const dwell = Math.max(2600, speed * 130);
    const t = setInterval(() => setIdx(i => (i + 1) % lines.length), dwell);
    return () => clearInterval(t);
  }, [isMulti, lines.length, speed]);

  if (lines.length === 0) return null;

  return (
    <div ref={boxRef} className="relative w-full h-11 flex items-center overflow-hidden">
      {!isMulti && (
        <span ref={measureRef} aria-hidden className={`${SPAN} invisible absolute whitespace-nowrap`}>
          {lines[0]}
        </span>
      )}
      {/* 邊緣柔化只留 20px：再寬就會把放大後的字吃掉，失去滿版的感覺 */}
      <div className="absolute left-0 top-0 bottom-0 w-5 z-10 pointer-events-none" style={{ background: `linear-gradient(90deg, ${maskColor}, transparent)` }} />
      <div className="absolute right-0 top-0 bottom-0 w-5 z-10 pointer-events-none" style={{ background: `linear-gradient(270deg, ${maskColor}, transparent)` }} />

      {isMulti ? (
        <div key={idx} className="w-full text-center px-3 animate-mqfade">
          <span className={`${SPAN} block truncate`} style={textStyle(hex)}>{lines[idx]}</span>
        </div>
      ) : reduce || !overflows ? (
        <div className="w-full text-center px-3">
          <span className={`${SPAN} block truncate`} style={textStyle(hex)}>{lines[0]}</span>
        </div>
      ) : (
        <div className="flex whitespace-nowrap" style={{ animation: `marquee ${speed}s linear infinite` }}>
          <span className={`${SPAN} px-6`} style={textStyle(hex)}>{lines[0]}</span>
          <span className={`${SPAN} px-6`} aria-hidden style={textStyle(hex)}>{lines[0]}</span>
        </div>
      )}
    </div>
  );
}

function parseLines(text: string): string[] {
  return text.split('\n').map(s => s.trim()).filter(Boolean);
}

export function Marquee({ data, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);

  if (!data.text.trim() && !editing) {
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
        點此設定跑馬燈
      </button>
    );
  }

  const lines = parseLines(data.text);

  return (
    <>
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 blur-bar border-b border-separator overflow-hidden"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', paddingBottom: '4px' }}
      >
        <button onClick={() => setEditing(true)} className="w-full">
          <MarqueeText key={lines.join('\n')} lines={lines} speed={data.speed} hex={colorHexOf(data.color)} />
        </button>
      </div>

      {editing && (
        <MarqueeEditor
          data={data}
          onSave={async (next) => { await onUpdate(next); setEditing(false); }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

function MarqueeEditor({
  data, onSave, onClose,
}: { data: MarqueeData; onSave: (d: MarqueeData) => Promise<void>; onClose: () => void }) {
  const [text, setText] = useState(data.text);
  const [speed, setSpeed] = useState(data.speed);
  const [color, setColor] = useState(data.color || 'gold');
  const [saving, setSaving] = useState(false);

  const lines = parseLines(text);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ text, speed, color });
    } catch {
      // 儲存失敗（useMarquee 已跳 toast 並還原）：留在編輯器讓使用者重試
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
        <div className="eyebrow">MARQUEE</div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-5 py-2 text-[13px] flex items-center gap-1.5"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          儲存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-7">
        {/* 預覽 */}
        {lines.length > 0 && (
          <div>
            <div className="eyebrow mb-2">PREVIEW</div>
            <div className="relative bg-bg border border-separator rounded-[14px] overflow-hidden h-11 flex items-center">
              <MarqueeText key={lines.join('\n')} lines={lines} speed={speed} hex={colorHexOf(color)} />
            </div>
          </div>
        )}

        {/* 文字 */}
        <div>
          <div className="eyebrow-tc mb-3">想留什麼訊息？</div>
          <textarea
            autoFocus
            placeholder={`一行一則訊息，例如：\n本週末記得訂位\n要試試新開的拉麵店\n生日快樂 🎂`}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            className="w-full bg-surface border border-separator focus:border-tint rounded-[14px] px-4 py-3 text-base text-text placeholder-muted focus:outline-none resize-none leading-relaxed"
          />
          <p className="text-[11px] text-muted mt-2 leading-relaxed">
            清空可關閉跑馬燈。多行＝多則，會一則一則淡入淡出輪播；單行太長才會橫向捲動。
          </p>
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
            <span className="text-[12px] text-muted">{lines.length >= 2 ? '多則切換快慢' : '捲動快慢'}</span>
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
