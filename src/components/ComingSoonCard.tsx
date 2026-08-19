import { Stars } from 'lucide-react';

interface Props {
  onClose: () => void;
}

// 功能還沒開放時擋在前面的卡片，語彙照維護畫面那套（眉標 + 襯線標題 + 灰色說明 + 髮絲線）。
// 之所以不是把按鈕藏起來：入口先留著，之後開放就只是把 App.tsx 的 WISH_POOL_ENABLED 翻成 true。
export function ComingSoonCard({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[3px] flex items-center justify-center px-8 animate-fadein"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="coming-soon-title"
    >
      <div
        className="card-surface rounded-[24px] px-7 py-9 w-full max-w-xs text-center animate-rise"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="w-14 h-14 rounded-[18px] mx-auto mb-6 flex items-center justify-center"
          style={{ background: 'var(--metal-rose)', boxShadow: 'var(--metal-gloss)' }}
        >
          <Stars size={24} className="text-on-accent" />
        </div>

        <div className="eyebrow mb-3">COMING SOON</div>
        <h2 id="coming-soon-title" className="t-title mb-4">許願池即將開放</h2>
        <p className="text-muted text-[14px] leading-relaxed">
          寫下想去哪、想吃什麼都不用講明確，<br />
          讓對方看到再去安排。<br />
          還在準備，很快就好。
        </p>

        <div className="mt-7 mb-7 h-[1px] w-12 bg-separator mx-auto" />

        <button onClick={onClose} className="btn-neutral w-full py-3 text-[14px]">
          知道了
        </button>
      </div>
    </div>
  );
}
