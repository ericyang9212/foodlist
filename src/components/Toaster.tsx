import { useEffect, useState } from 'react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';
import { subscribeToasts, dismissToast, type Toast } from '../lib/toast';

const ICONS = {
  success: <Check size={15} className="text-[#c9a961]" />,
  error: <AlertTriangle size={15} className="text-[#c98a8a]" />,
  info: <Info size={15} className="text-[#8a8478]" />,
};

const BORDERS = {
  success: 'border-[#c9a961]/40',
  error: 'border-[#a85959]/50',
  info: 'border-[#2c261d]',
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[100] w-full max-w-[400px] px-4 flex flex-col gap-2 pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 92px)' }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 bg-[#171410] border ${BORDERS[t.kind]} rounded-[6px] px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.5)] animate-slideup`}
        >
          {ICONS[t.kind]}
          <span className="flex-1 text-[13px] text-[#e5e0d5] tracking-wide leading-snug">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="text-[#837b6e] hover:text-[#c9a961] transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
