import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Pencil, X, Loader2, Check } from 'lucide-react';
import type { MarqueeData } from '../store/useMarquee';

interface Props {
  data: MarqueeData;
  onUpdate: (next: MarqueeData) => Promise<void>;
}

// 情境色：key 存進資料庫，hex 用於顯示
export const MARQUEE_COLORS: { key: string; label: string; hex: string }[] = [
  { key: 'gold', label: '金', hex: '#ead8aa' },
  { key: 'rose', label: '玫瑰', hex: '#e6a9c4' },
  { key: 'red', label: '暖紅', hex: '#e6a07a' },
  { key: 'teal', label: '霧藍', hex: '#8fc7c2' },
];
function colorHexOf(key: string): string {
  return MARQUEE_COLORS.find(c => c.key === key)?.hex ?? '#ead8aa';
}

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const h = () => setReduce(mq.matches);
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }, []);
  return reduce;
}

const SPAN = 'text-[16px] tracking-[0.25em] font-medium';

// 共用的跑馬燈內容：短句置中靜止、長句橫向捲動、多則淡入淡出輪播；尊重「減少動態」
function MarqueeText({ lines, speed, hex, maskColor = '#0a0a0a' }: {
  lines: string[]; speed: number; hex: string; maskColor?: string;
}) {
  const isMulti = lines.length >= 2;
  const reduce = usePrefersReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [idx, setIdx] = useState(0);

  // 單句：量測是否塞不下 → 塞得下就靜止、塞不下才捲
  useLayoutEffect(() => {
    if (isMulti) { setOverflow(false); return; }
    const w = wrapRef.current, m = measureRef.current;
    if (w && m) setOverflow(m.offsetWidth > w.clientWidth - 24);
  }, [lines, isMulti]);

  // 多則：定時淡入淡出切換
  useEffect(() => {
    if (!isMulti) { setIdx(0); return; }
    setIdx(0);
    const dwell = Math.max(2600, speed * 130);
    const t = setInterval(() => setIdx(i => (i + 1) % lines.length), dwell);
    return () => clearInterval(t);
  }, [isMulti, lines.length, speed]);

  if (lines.length === 0) return null;

  return (
    <div ref={wrapRef} className="relative w-full h-11 flex items-center overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none" style={{ background: `linear-gradient(90deg, ${maskColor}, transparent)` }} />
      <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none" style={{ background: `linear-gradient(270deg, ${maskColor}, transparent)` }} />

      {!isMulti && (
        <span ref={measureRef} aria-hidden className={`${SPAN} whitespace-nowrap fixed -left-[9999px] top-0`}>{lines[0]}</span>
      )}

      {isMulti ? (
        <div key={idx} className="w-full text-center px-6 animate-mqfade">
          <span className={`${SPAN} inline-block max-w-full truncate align-bottom`} style={{ color: hex }}>{lines[idx]}</span>
        </div>
      ) : overflow && !reduce ? (
        <div className="flex whitespace-nowrap" style={{ animation: `marquee ${speed}s linear infinite` }}>
          <span className={`${SPAN} px-5`} style={{ color: hex }}>{lines[0]}</span>
          <span className={`${SPAN} px-5`} aria-hidden style={{ color: hex }}>{lines[0]}</span>
        </div>
      ) : (
        <div className="w-full text-center px-6">
          <span className={`${SPAN} inline-block max-w-full truncate align-bottom`} style={{ color: hex }}>{lines[0]}</span>
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
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center justify-center gap-1.5 text-[12px] tracking-[0.4em] text-[#3a3a3a] hover:text-[#c9a961]/60 transition-colors"
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
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 bg-[#0a0a0a] border-b border-[#c9a961]/15 overflow-hidden"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)', paddingBottom: '4px' }}
      >
        <button onClick={() => setEditing(true)} className="w-full">
          <MarqueeText lines={lines} speed={data.speed} hex={colorHexOf(data.color)} />
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
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a] animate-fadein" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div
        className="flex items-center justify-between px-6 pb-4 border-b border-[#1f1f1f]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button onClick={onClose} className="icon-btn">
          <X size={22} />
        </button>
        <div className="text-[12px] tracking-[0.4em] text-[#c9a961]/80">MARQUEE</div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary px-5 py-2 text-[13px] tracking-[0.3em] flex items-center gap-1.5"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          儲存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-7">
        {/* 預覽 */}
        {lines.length > 0 && (
          <div>
            <div className="text-[11px] tracking-[0.4em] text-[#c9a961]/60 mb-2">PREVIEW</div>
            <div className="relative bg-[#0a0a0a] border border-[#c9a961]/15 rounded-[8px] overflow-hidden h-11 flex items-center">
              <MarqueeText lines={lines} speed={speed} hex={colorHexOf(color)} />
            </div>
          </div>
        )}

        {/* 文字 */}
        <div>
          <div className="text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-3">想留什麼訊息？</div>
          <textarea
            autoFocus
            placeholder={`一行一則訊息，例如：\n本週末記得訂位\n要試試新開的拉麵店\n生日快樂 🎂`}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-[#c9a961]/40 rounded-[8px] px-4 py-3 text-[15px] text-[#f5f1e8] placeholder-[#555] focus:outline-none resize-none leading-relaxed"
          />
          <p className="text-[11px] text-[#666] tracking-wider mt-2 leading-relaxed">
            清空可關閉跑馬燈。多行＝多則，會一則一則淡入淡出輪播；單行太長才會橫向捲動。
          </p>
        </div>

        {/* 顏色 */}
        <div>
          <div className="text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-3">顏色</div>
          <div className="flex gap-3">
            {MARQUEE_COLORS.map(c => (
              <button
                key={c.key}
                onClick={() => setColor(c.key)}
                aria-label={c.label}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-95"
                style={{ background: c.hex, boxShadow: color === c.key ? `0 0 0 2px #0a0a0a, 0 0 0 4px ${c.hex}` : 'none' }}
              >
                {color === c.key && <Check size={16} className="text-[#100d07]" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        {/* 速度 */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[13px] tracking-[0.4em] text-[#c9a961]/60">速度</span>
            <span className="text-[12px] text-[#8a8478] tracking-wider">{lines.length >= 2 ? '多則切換快慢' : '捲動快慢'}</span>
          </div>
          <input
            type="range"
            min={8}
            max={60}
            step={2}
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            className="w-full accent-[#c9a961]"
          />
          <div className="flex justify-between text-[10px] text-[#555] tracking-widest mt-1">
            <span>快</span>
            <span>慢</span>
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
