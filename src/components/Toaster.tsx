import { useEffect, useState } from 'react';
import { Check, AlertTriangle, Info, X } from 'lucide-react';
import { subscribeToasts, dismissToast, type Toast } from '../lib/toast';

const ICONS = {
  success: <Check size={15} className="text-teal" />,
  error: <AlertTriangle size={15} className="text-danger" />,
  info: <Info size={15} className="text-muted" />,
};

const BORDERS = {
  success: 'border-teal/40',
  error: 'border-danger/50',
  info: 'border-separator',
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
          className={`pointer-events-auto flex items-center gap-3 bg-surface border ${BORDERS[t.kind]} rounded-[12px] px-4 py-3 shadow-[var(--shadow-raised)] animate-slideup`}
        >
          {ICONS[t.kind]}
          <span className="flex-1 text-[13px] text-text leading-snug">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="text-muted hover:text-tint transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
