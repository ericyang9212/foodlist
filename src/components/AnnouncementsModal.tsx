import { useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import type { Announcement } from '../store/useAnnouncements';

interface Props {
  items: Announcement[];
  readIds: Set<string>;
  onMarkAllRead: () => void;
  onClose: () => void;
}

export function AnnouncementsModal({ items, readIds, onMarkAllRead, onClose }: Props) {
  // 開啟時自動把全部標為已讀
  useEffect(() => {
    const t = setTimeout(() => onMarkAllRead(), 600);
    return () => clearTimeout(t);
  }, [onMarkAllRead]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]" style={{ maxWidth: 430, margin: '0 auto' }}>
      <div
        className="flex items-center justify-between px-6 pb-4 border-b border-[#1f1f1f]"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button onClick={onClose} className="p-1">
          <X size={22} className="text-[#8a8478]" />
        </button>
        <div className="flex items-center gap-2 text-[12px] tracking-[0.4em] text-[#c9a961]/80">
          <Bell size={13} />
          公告
        </div>
        <div className="w-7" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-[#c9a961]/40 text-3xl tracking-[0.5em] mb-3">— —</div>
            <p className="text-[#777] text-[14px] tracking-wider">目前沒有公告</p>
          </div>
        ) : (
          <div className="space-y-5">
            {items.map(a => (
              <article
                key={a.id}
                className={`relative bg-[#161616] border ${
                  readIds.has(a.id) ? 'border-[#1f1f1f]' : 'border-[#c9a961]/40'
                } px-5 py-5`}
              >
                {!readIds.has(a.id) && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#c9a961] rounded-full" />
                )}
                <h3 className="text-[18px] text-gold-gradient font-medium tracking-wide leading-tight mb-2">
                  {a.title}
                </h3>
                <div className="text-[11px] tracking-[0.3em] text-[#555] mb-3">
                  {new Date(a.createdAt).toLocaleDateString('zh-TW')}
                </div>
                {a.body && (
                  <p className="text-[14px] text-[#d6d0c0] leading-relaxed whitespace-pre-wrap">
                    {a.body}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
