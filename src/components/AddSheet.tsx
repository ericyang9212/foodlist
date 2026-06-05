import { Pencil, ImagePlus, X } from 'lucide-react';

interface Props {
  onPickText: () => void;
  onPickImage: () => void;
  onClose: () => void;
}

export function AddSheet({ onPickText, onPickImage, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-[#0f0f0f] border-t border-x border-[#c9a961]/30 sm:border sm:mb-0 mx-auto animate-slideup"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[#1f1f1f]">
          <div>
            <div className="text-[12px] tracking-[0.5em] text-[#c9a961]/70 mb-1">WANT TO EAT</div>
            <h3 className="text-[20px] text-gold-gradient font-medium tracking-[0.15em]">想 吃 的</h3>
          </div>
          <button onClick={onClose} className="p-1">
            <X size={20} className="text-[#666]" />
          </button>
        </div>

        {/* Choices */}
        <div className="px-2 py-3">
          <Choice
            icon={<Pencil size={22} className="text-[#c9a961]" />}
            title="直接輸入"
            sub="清楚知道想吃什麼"
            onClick={() => { onPickText(); onClose(); }}
          />
          <div className="h-[1px] bg-[#1f1f1f] mx-4" />
          <Choice
            icon={<ImagePlus size={22} className="text-[#c9a961]" />}
            title="丟張截圖進來"
            sub="IG / Threads / 朋友傳的，之後再決定"
            onClick={() => { onPickImage(); onClose(); }}
          />
        </div>

        <div className="h-4" />
      </div>
    </div>
  );
}

function Choice({
  icon, title, sub, onClick,
}: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-4 hover:bg-[#161616] active:bg-[#1a1a1a] transition-colors text-left"
    >
      <div className="w-12 h-12 flex items-center justify-center border border-[#c9a961]/30 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] text-[#f5f1e8] tracking-wider font-medium">{title}</div>
        <div className="text-[12px] text-[#777] tracking-wider mt-0.5">{sub}</div>
      </div>
    </button>
  );
}
