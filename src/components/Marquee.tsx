import { useState } from 'react';
import { Pencil, X, Loader2 } from 'lucide-react';
import type { MarqueeData } from '../store/useMarquee';

interface Props {
  data: MarqueeData;
  onUpdate: (next: MarqueeData) => Promise<void>;
}

export function Marquee({ data, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);

  if (!data.text.trim() && !editing) {
    // 沒設定文字：顯示一條很細的可點選提示條
    return (
      <button
        onClick={() => setEditing(true)}
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center justify-center gap-1 text-[10px] tracking-[0.4em] text-[#3a3a3a] hover:text-[#c9a961]/60 transition-colors"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 4px)',
          paddingBottom: '4px',
        }}
      >
        <Pencil size={9} />
        點此設定跑馬燈
      </button>
    );
  }

  // 把文字分割成「點」分隔，方便視覺呼吸
  const lines = data.text.split('\n').map(s => s.trim()).filter(Boolean);
  const single = lines.join('   ✦   ');

  return (
    <>
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 bg-[#0a0a0a] border-b border-[#c9a961]/15 overflow-hidden"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <button
          onClick={() => setEditing(true)}
          className="relative w-full h-8 flex items-center overflow-hidden group"
        >
          {/* 左右漸層遮罩 */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

          {/* 跑馬燈 */}
          <div
            className="flex whitespace-nowrap"
            style={{
              animation: `marquee ${data.speed}s linear infinite`,
            }}
          >
            <span className="text-[12px] tracking-[0.25em] text-[#c9a961] px-4">
              {single}
            </span>
            <span className="text-[12px] tracking-[0.25em] text-[#c9a961] px-4" aria-hidden="true">
              {single}
            </span>
          </div>
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
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ text, speed });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div
        className="flex items-center justify-between px-6 pb-4 border-b border-[#1f1f1f]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button onClick={onClose} className="p-1">
          <X size={22} className="text-[#8a8478]" />
        </button>
        <div className="text-[12px] tracking-[0.4em] text-[#c9a961]/80">MARQUEE</div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-[14px] tracking-[0.3em] text-[#c9a961] flex items-center gap-1 disabled:opacity-50"
        >
          {saving && <Loader2 size={12} className="animate-spin" />}
          儲存
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-7">
        {/* 預覽 */}
        {text.trim() && (
          <div>
            <div className="text-[11px] tracking-[0.4em] text-[#c9a961]/60 mb-2">PREVIEW</div>
            <div className="relative bg-[#0f0f0f] border border-[#c9a961]/15 overflow-hidden h-8 flex items-center">
              <div
                className="flex whitespace-nowrap"
                style={{ animation: `marquee ${speed}s linear infinite` }}
              >
                <span className="text-[12px] tracking-[0.25em] text-[#c9a961] px-4">
                  {text.split('\n').map(s => s.trim()).filter(Boolean).join('   ✦   ')}
                </span>
                <span className="text-[12px] tracking-[0.25em] text-[#c9a961] px-4" aria-hidden="true">
                  {text.split('\n').map(s => s.trim()).filter(Boolean).join('   ✦   ')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 文字 */}
        <div>
          <div className="text-[13px] tracking-[0.4em] text-[#c9a961]/60 mb-3">想流什麼訊息？</div>
          <textarea
            autoFocus
            placeholder={`一行一則訊息，例如：\n本週末記得訂位\n要試試新開的拉麵店\n生日快樂 🎂`}
            value={text}
            onChange={e => setText(e.target.value)}
            rows={6}
            className="w-full bg-[#161616] border border-[#2a2a2a] focus:border-[#c9a961]/40 px-4 py-3 text-[15px] text-[#f5f1e8] placeholder-[#555] focus:outline-none resize-none leading-relaxed"
          />
          <p className="text-[11px] text-[#666] tracking-wider mt-2 leading-relaxed">
            清空可以關閉跑馬燈。多行訊息會被以 ✦ 分隔，連續循環。
          </p>
        </div>

        {/* 速度 */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[13px] tracking-[0.4em] text-[#c9a961]/60">速度</span>
            <span className="text-[12px] text-[#8a8478] tracking-wider">{speed} 秒跑完一圈</span>
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
